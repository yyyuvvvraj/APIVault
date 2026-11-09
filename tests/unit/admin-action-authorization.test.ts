import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const protectedActions = [
  "src/app/admin/(console)/apis/actions.ts",
  "src/app/admin/(console)/apis/edit-actions.ts",
  "src/app/admin/(console)/apis/lifecycle-actions.ts",
  "src/app/admin/(console)/submissions/actions.ts",
  "src/app/admin/(console)/submissions/approval-actions.ts",
  "src/app/admin/(console)/categories/actions.ts",
] as const;

test("every admin server action authorizes before reading input or accessing data", () => {
  for (const path of protectedActions) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /import\s*\{\s*requireAdmin\s*\}\s*from\s*["']@\/lib\/admin-auth["']/,
      `${path} must import the shared administrator guard`);

    const actions = [...source.matchAll(/export\s+async\s+function\s+(\w+Action)\s*\(/g)];
    assert.ok(actions.length > 0, `${path} must export at least one server action`);

    for (let index = 0; index < actions.length; index += 1) {
      const action = actions[index];
      const actionStart = action.index ?? -1;
      const actionEnd = actions[index + 1]?.index ?? source.length;
      const actionSource = source.slice(actionStart, actionEnd);
      const guardPosition = actionSource.indexOf("await requireAdmin();");
      assert.notEqual(guardPosition, -1,
        `${path}#${action[1]} must call requireAdmin()`);

      const accessPatterns = [
        "formData.get(",
        "formData.getAll(",
        "value(formData,",
        "formString(formData,",
        "formStringArray(formData,",
        "stringField(formData,",
        "stringArray(formData,",
        "getPrisma(",
        "prisma.$transaction(",
      ];
      const firstInputOrDatabaseAccess = accessPatterns
        .map((pattern) => actionSource.indexOf(pattern))
        .filter((position) => position >= 0)
        .sort((a, b) => a - b)[0];

      assert.ok(
        firstInputOrDatabaseAccess === undefined || guardPosition < firstInputOrDatabaseAccess,
        `${path}#${action[1]} must authorize before reading untrusted form input or accessing the database`,
      );
    }
  }
});
