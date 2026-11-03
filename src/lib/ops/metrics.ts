import { timingSafeEqual } from "node:crypto";
type RequestMetric = { count: number; durationSeconds: number };
const requestMetrics = new Map<string, RequestMetric>();
function escapeLabel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
export function recordHttpRequestMetric(route: string, method: string, status: number, durationMs: number): void {
  const key = JSON.stringify([route, method, status]);
  const metric = requestMetrics.get(key) ?? { count: 0, durationSeconds: 0 };
  metric.count += 1;
  metric.durationSeconds += Math.max(0, durationMs) / 1000;
  requestMetrics.set(key, metric);
}
export function renderPrometheusMetrics(): string {
  const lines = ["# HELP apivault_http_requests_total Completed HTTP requests in this process.", "# TYPE apivault_http_requests_total counter"];
  for (const [key, metric] of requestMetrics) {
    const [route, method, status] = JSON.parse(key) as [string, string, number];
    const labels = `route="${escapeLabel(route)}",method="${escapeLabel(method)}",status="${status}"`;
    lines.push(`apivault_http_requests_total{${labels}} ${metric.count}`);
  }
  lines.push("# HELP apivault_http_request_duration_seconds_sum Total observed request duration in seconds.", "# TYPE apivault_http_request_duration_seconds_sum counter");
  for (const [key, metric] of requestMetrics) {
    const [route, method, status] = JSON.parse(key) as [string, string, number];
    const labels = `route="${escapeLabel(route)}",method="${escapeLabel(method)}",status="${status}"`;
    lines.push(`apivault_http_request_duration_seconds_sum{${labels}} ${metric.durationSeconds}`);
  }
  const memory = process.memoryUsage();
  lines.push("# HELP apivault_process_uptime_seconds Process uptime in seconds.", "# TYPE apivault_process_uptime_seconds gauge", `apivault_process_uptime_seconds ${process.uptime()}`, "# HELP apivault_process_resident_memory_bytes Resident memory in bytes.", "# TYPE apivault_process_resident_memory_bytes gauge", `apivault_process_resident_memory_bytes ${memory.rss}`, "# HELP apivault_process_heap_used_bytes Node.js heap used in bytes.", "# TYPE apivault_process_heap_used_bytes gauge", `apivault_process_heap_used_bytes ${memory.heapUsed}`);
  return `${lines.join("\n")}\n`;
}
export function isMetricsAuthorized(authorization: string | null, expectedToken: string | undefined): boolean {
  if (!expectedToken || expectedToken.length < 32 || !authorization?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(expectedToken);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
