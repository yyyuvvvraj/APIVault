import { NextResponse } from "next/server";
import { withRequestContext } from "@/lib/request-context";
import { getPrisma } from "@/lib/db";
import { evaluateReadiness } from "@/lib/ops/readiness";

export const GET = withRequestContext("/api/health/ready", async function GET(request: Request) {
  void request;
  const result = await evaluateReadiness(() => getPrisma().$queryRaw`SELECT 1`);

  return NextResponse.json(result.body, {
    status: result.httpStatus,
    headers: { "Cache-Control": "no-store" },
  });
});
