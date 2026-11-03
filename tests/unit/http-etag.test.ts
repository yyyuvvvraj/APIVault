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

test("If-None-Match does not split commas inside quoted opaque tags", () => {
  const etag = '"opaque,tag"';
  assert.equal(matchesIfNoneMatch('"other", W/"opaque,tag"', etag), true);
  assert.equal(matchesIfNoneMatch('"opaque,tag"', etag), true);
  assert.equal(matchesIfNoneMatch('"opaque", "tag"', etag), false);
});

test("If-None-Match ignores empty list members and compares weak validators", () => {
  assert.equal(matchesIfNoneMatch(' , "current", ', '"current"'), true);
  assert.equal(matchesIfNoneMatch('W/"different"', '"current"'), false);
  assert.equal(matchesIfNoneMatch('W/"current"', '"current"'), true);
});
