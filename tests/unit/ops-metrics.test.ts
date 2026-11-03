import assert from "node:assert/strict";
import test from "node:test";
import { isMetricsAuthorized, recordHttpRequestMetric, renderPrometheusMetrics } from "../../src/lib/ops/metrics";
test("metrics authorization requires a configured strong bearer token", () => {
  assert.equal(isMetricsAuthorized("Bearer abc", "abc"), false);
  assert.equal(isMetricsAuthorized(null, "a".repeat(32)), false);
  assert.equal(isMetricsAuthorized(`Bearer ${"a".repeat(32)}`, undefined), false);
  assert.equal(isMetricsAuthorized(`Bearer ${"a".repeat(32)}`, "a".repeat(32)), true);
  assert.equal(isMetricsAuthorized(`Bearer ${"b".repeat(32)}`, "a".repeat(32)), false);
});
test("metrics export uses bounded route labels and Prometheus text format", () => {
  recordHttpRequestMetric("/api/v1/apis", "GET", 200, 125);
  const metrics = renderPrometheusMetrics();
  assert.match(metrics, /# TYPE apivault_http_requests_total counter/);
  assert.match(metrics, /apivault_http_requests_total\{route="\/api\/v1\/apis",method="GET",status="200"\} 1/);
  assert.match(metrics, /apivault_http_request_duration_seconds_sum\{route="\/api\/v1\/apis",method="GET",status="200"\} 0\.125/);
  assert.match(metrics, /apivault_process_resident_memory_bytes \d+/);
});
