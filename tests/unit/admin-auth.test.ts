import assert from "node:assert/strict";
import test from "node:test";
import { hasAdminRole } from "../../src/lib/admin-role";

test("only an explicit admin role grants administrator access", () => {
  assert.equal(hasAdminRole("admin"), true);
  assert.equal(hasAdminRole("user,admin"), true);
  assert.equal(hasAdminRole("user, admin"), true);
  assert.equal(hasAdminRole("user"), false);
  assert.equal(hasAdminRole("administrator"), false);
  assert.equal(hasAdminRole(""), false);
  assert.equal(hasAdminRole(null), false);
  assert.equal(hasAdminRole(undefined), false);
  assert.equal(hasAdminRole(["admin"]), false);
});
