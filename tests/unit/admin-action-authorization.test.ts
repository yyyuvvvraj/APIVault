import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const protectedActions = [
  "src/app/admin/(console)/apis/actions.ts",
  "src/app/admin/(console)/apis/edit-actions.ts",
  "src/app/admin/(console)/apis/lifecycle-actions.ts",
  "src/app/admin/(console)/submissions/actions.ts",
  "src/app/admin/(console)/submissions/approval-actions.ts",
] as const;

test("every admin server-action module enforces requireAdmin before handling input or data", () => {
  for (const path of protectedActions) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /import\s*\{\s*requireAdmin\s*\}\s*from\s*["']@\/lib\/admin-auth["']/,
      `${path} must import the shared administrator guard`);

    const actionStart = source.search(/export\s+async\s+function\s+\w+Action\s*\(/);
    assert.notEqual(actionStart, -1, `${path} must export a server action`);
    const guardPosition = source.indexOf("await requireAdmin();", actionStart);
    assert.notEqual(guardPosition, -1, `${path} must call requireAdmin()`);

    const firstInputOrDatabaseAccess = [
      source.indexOf("formData.get(", actionStart),
      source.indexOf("getPrisma()", actionStart),
      source.indexOf("prisma.$transaction", actionStart),
    ].filter((position) => position >= 0).sort((a, b) => a - b)[0];

    assert.ok(
      firstInputOrDatabaseAccess === undefined || guardPosition < firstInputOrDatabaseAccess,
      `${path} must authorize before reading untrusted form input or accessing the database`,
    );
  }
});
