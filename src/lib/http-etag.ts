import { createHash } from "node:crypto";

export function createEtag(payload: unknown): string {
  const serialized = JSON.stringify(payload);
  const digest = createHash("sha256").update(serialized).digest("base64url");
  return `"${digest}"`;
}

/** Implements the weak comparison required for If-None-Match on GET/HEAD. */
export function matchesIfNoneMatch(header: string | null, etag: string): boolean {
  if (!header) return false;
  return header.split(",").some((candidate) => {
    const value = candidate.trim();
    return value === "*" || value === etag || value.replace(/^W\//, "") === etag;
  });
}
