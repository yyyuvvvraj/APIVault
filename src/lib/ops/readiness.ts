export type ReadinessResult = {
  httpStatus: 200 | 503;
  body: {
    status: "ready" | "not_ready";
    checks: { database: "ok" | "unavailable" };
  };
};

export async function evaluateReadiness(
  checkDatabase: () => Promise<unknown>,
): Promise<ReadinessResult> {
  try {
    await checkDatabase();
    return {
      httpStatus: 200,
      body: { status: "ready", checks: { database: "ok" } },
    };
  } catch {
    return {
      httpStatus: 503,
      body: { status: "not_ready", checks: { database: "unavailable" } },
    };
  }
}
