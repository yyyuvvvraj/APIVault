import assert from "node:assert/strict";
import test from "node:test";
import { hasSameOrigin } from "@/lib/security/origin";

test("same-origin mutations accept the matching browser origin", () => {
  const request = new Request("https://apivault.example/api/account/keys", {
    method: "POST",
    headers: { origin: "https://apivault.example" },
  });
  assert.equal(hasSameOrigin(request), true);
});

test("same-origin mutations reject a foreign origin", () => {
  const request = new Request("https://apivault.example/api/account/keys", {
    method: "POST",
    headers: { origin: "https://attacker.example" },
  });
  assert.equal(hasSameOrigin(request), false);
});

test("same-origin guard tolerates origin-less server-to-server requests", () => {
  const request = new Request("https://apivault.example/api/account/keys", { method: "POST" });
  assert.equal(hasSameOrigin(request), true);
});
