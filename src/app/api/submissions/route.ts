import { NextResponse } from "next/server";
import { SubmissionKind, SourceKind, type Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { hasSameOrigin } from "@/lib/security/origin";
import { apiSubmissionSchema } from "@/lib/validation/api";
import { consumeRateLimit, hashClientIp, rateLimitHeaders } from "@/lib/api-rate-limit";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "unauthorized", message: "Sign in before submitting an API." }, { status: 401 });
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 65_536) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const rate = await consumeRateLimit(hashClientIp(`submission:${session.user.id}`), { limit: 5, windowSeconds: 3600 });
  if (!rate.allowed) return NextResponse.json({ error: "rate_limit_exceeded", message: "You can submit up to 5 suggestions per hour." }, { status: 429, headers: { ...rateLimitHeaders(rate), "Retry-After": String(rate.retryAfterSeconds) } });

  const body = await request.json().catch(() => null) as { kind?: unknown; targetApiId?: unknown; api?: unknown } | null;
  if (!body || !Object.values(SubmissionKind).includes(body.kind as SubmissionKind)) {
    return NextResponse.json({ error: "invalid_request", message: "Choose CREATE or UPDATE." }, { status: 400 });
  }
  const parsed = apiSubmissionSchema.safeParse(body.api);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  const kind = body.kind as SubmissionKind;
  const targetApiId = typeof body.targetApiId === "string" ? body.targetApiId : null;
  if ((kind === SubmissionKind.CREATE && targetApiId) || (kind === SubmissionKind.UPDATE && !targetApiId) || (targetApiId !== null && !/^[0-9a-f-]{36}$/i.test(targetApiId))) {
    return NextResponse.json({ error: "invalid_request", message: "UPDATE submissions must reference an existing API; CREATE submissions must not." }, { status: 400 });
  }
  const prisma = getPrisma();
  if (targetApiId) {
    const target = await prisma.api.findUnique({ where: { id: targetApiId }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "not_found", message: "The API to update could not be found." }, { status: 404 });
  }
  const input = parsed.data;
  const sourceRows = new Map<string, { sourceKind: SourceKind; url: string }>();
  sourceRows.set(input.homepageUrl, { sourceKind: SourceKind.OFFICIAL_HOMEPAGE, url: input.homepageUrl });
  if (input.documentationUrl) sourceRows.set(input.documentationUrl, { sourceKind: SourceKind.DOCUMENTATION, url: input.documentationUrl });
  for (const url of input.sourceUrls) if (!sourceRows.has(url)) sourceRows.set(url, { sourceKind: SourceKind.OTHER, url });

  const created = await prisma.apiSubmission.create({
    data: {
      kind, targetApiId, submitterUserId: session.user.id, submitterName: session.user.name,
      submitterGithub: null, payload: input as Prisma.InputJsonValue,
      sources: { create: [...sourceRows.values()] },
    },
    select: { id: true, status: true, kind: true, createdAt: true },
  });
  return NextResponse.json({ data: created }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
