import { NextResponse } from "next/server";
import { isMetricsAuthorized, renderPrometheusMetrics } from "@/lib/ops/metrics";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!isMetricsAuthorized(request.headers.get("authorization"), process.env.APIVAULT_METRICS_TOKEN)) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return new NextResponse(renderPrometheusMetrics(), { status: 200, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; version=0.0.4; charset=utf-8" } });
}
