import assert from "node:assert/strict";
import test from "node:test";
import { resolveRequestId } from "../../src/lib/request-context";

test("request IDs preserve safe caller-provided values", () => {
  assert.equal(resolveRequestId("trace-123"), "trace-123");
  assert.equal(resolveRequestId("  trace_123  "), "trace_123");
});

test("missing or unsafe request IDs are replaced with generated identifiers", () => {
  for (const value of [null, "", "bad value", "x".repeat(129), "trace\nforged"]) {
    const id = resolveRequestId(value);
    assert.match(id, /^[0-9a-f-]{36}$/i);
  }
});
