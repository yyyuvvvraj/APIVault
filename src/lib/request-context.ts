import { randomUUID } from "node:crypto";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export function resolveRequestId(value: string | null): string {
  const candidate = value?.trim();
  return candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
}

type RequestHandler<TRequest extends Request, TArgs extends unknown[]> = (
  request: TRequest,
  ...args: TArgs
) => Promise<Response>;

/**
 * Adds a stable request identifier to a route response and emits one structured
 * completion record. Query strings and client addresses are deliberately omitted.
 */
export function withRequestContext<TRequest extends Request, TArgs extends unknown[]>(
  route: string,
  handler: RequestHandler<TRequest, TArgs>,
) {
  return async function requestContextHandler(
    request: TRequest,
    ...args: TArgs
  ): Promise<Response> {
    const requestId = resolveRequestId(request.headers.get("x-request-id"));
    const startedAt = Date.now();

    try {
      const response = await handler(request, ...args);
      response.headers.set("X-Request-Id", requestId);

      const status = response.status;
      const record = {
        level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
        event: "http.request.completed",
        requestId,
        route,
        method: request.method,
        path: new URL(request.url).pathname,
        status,
        durationMs: Math.max(0, Date.now() - startedAt),
      };
      const serialized = JSON.stringify(record);
      if (status >= 500) console.error(serialized);
      else if (status >= 400) console.warn(serialized);
      else console.info(serialized);

      return response;
    } catch (error) {
      console.error(JSON.stringify({
        level: "error",
        event: "http.request.failed",
        requestId,
        route,
        method: request.method,
        path: new URL(request.url).pathname,
        durationMs: Math.max(0, Date.now() - startedAt),
        errorType: error instanceof Error ? error.name : "UnknownError",
      }));
      throw error;
    }
  };
}
