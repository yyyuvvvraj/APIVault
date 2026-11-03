import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Docker release workflow accepts v0 and v1 tags and enforces stable ancestry", () => {
  const workflow = readFileSync(".github/workflows/docker-publish.yml", "utf8");

  assert.match(workflow, /tags: \["v0\.\*", "v1\.\*"\]/);
  assert.match(workflow, /refs\/tags\/v0\./);
  assert.match(workflow, /refs\/tags\/v1\./);
  assert.match(workflow, /git merge-base --is-ancestor "\$GITHUB_SHA" origin\/stable/);
});
