import assert from "node:assert/strict";
import test from "node:test";
import { verificationReviewNoteError } from "../../src/lib/catalogue/lifecycle-service";

test("verification requires a meaningful evidence review note", () => {
  assert.match(verificationReviewNoteError("") ?? "", /required/);
  assert.match(verificationReviewNoteError("   ") ?? "", /required/);
  assert.match(verificationReviewNoteError("ok") ?? "", /at least 5/);
  assert.equal(verificationReviewNoteError("Checked official docs and pricing."), null);
});

test("verification review notes are limited to 500 characters", () => {
  assert.match(verificationReviewNoteError("x".repeat(501)) ?? "", /500/);
});
