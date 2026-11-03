import assert from "node:assert/strict";
import test from "node:test";
import { createEtag, matchesIfNoneMatch } from "../../src/lib/http-etag";

test("ETags are deterministic for the same public response payload", () => {
  assert.equal(createEtag({ data: [{ id: "api-1" }] }), createEtag({ data: [{ id: "api-1" }] }));
  assert.notEqual(createEtag({ data: [{ id: "api-1" }] }), createEtag({ data: [{ id: "api-2" }] }));
});

test("If-None-Match supports strong, weak, wildcard, and multiple validators", () => {
  const etag = createEtag({ data: [] });
  assert.equal(matchesIfNoneMatch(etag, etag), true);
  assert.equal(matchesIfNoneMatch(`W/${etag}`, etag), true);
  assert.equal(matchesIfNoneMatch(`"other", ${etag}`, etag), true);
  assert.equal(matchesIfNoneMatch("*", etag), true);
  assert.equal(matchesIfNoneMatch('"other"', etag), false);
  assert.equal(matchesIfNoneMatch(null, etag), false);
});
