import { timingSafeEqual } from "node:crypto";

export function isVerifierAuthorized(request: Request): boolean {
  const expected = process.env.VERIFIER_SHARED_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!expected || expected.length < 32 || !authorization.startsWith("Bearer ")) return false;

  const supplied = authorization.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}
