import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

const setupScript = readFileSync("scripts/setup-local.sh", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

test("local setup is exposed as a package command and has valid Bash syntax", () => {
  assert.equal(packageJson.scripts["setup:local"], "bash scripts/setup-local.sh");
  const syntax = spawnSync("bash", ["-n", "scripts/setup-local.sh"], { encoding: "utf8" });
  assert.equal(syntax.status, 0, syntax.stderr);
});

test("local setup checks supported runtime and Docker readiness before changing state", () => {
  assert.match(setupScript, /process\.versions\.node/);
  assert.match(setupScript, /docker compose version/);
  assert.match(setupScript, /docker info/);
  assert.match(setupScript, /docker compose up -d postgres/);
  assert.match(setupScript, /pg_isready/);
});

test("local setup creates a random auth secret without overwriting an existing one", () => {
  assert.match(setupScript, /randomBytes\(32\)/);
  assert.match(setupScript, /if \(!configured\)/);
  assert.match(setupScript, /BETTER_AUTH_SECRET/);
});

test("local setup applies committed migrations and seeds categories without deleting volumes", () => {
  assert.match(setupScript, /npm run db:deploy/);
  assert.match(setupScript, /npm run db:seed/);
  assert.doesNotMatch(setupScript, /docker compose down -v/);
  assert.doesNotMatch(setupScript, /prisma migrate reset/);
});
