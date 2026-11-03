import { createHash } from "node:crypto";

export function createEtag(payload: unknown): string {
  const serialized = JSON.stringify(payload);
  const digest = createHash("sha256").update(serialized).digest("base64url");
  return `"${digest}"`;
}

/** Split an entity-tag list without treating commas inside quoted tags as separators. */
function splitEntityTagList(header: string): string[] {
  const values: string[] = [];
  let start = 0;
  let insideQuotes = false;
  for (let index = 0; index < header.length; index += 1) {
    if (header[index] === '"') insideQuotes = !insideQuotes;
    else if (header[index] === "," && !insideQuotes) {
      values.push(header.slice(start, index).trim());
      start = index + 1;
    }
  }
  values.push(header.slice(start).trim());
  return values.filter(Boolean);
}

/** Implements the weak comparison required for If-None-Match on GET/HEAD. */
export function matchesIfNoneMatch(header: string | null, etag: string): boolean {
  if (!header) return false;
  return splitEntityTagList(header).some((candidate) => {
    if (candidate === "*") return true;
    const validator = candidate.startsWith("W/") ? candidate.slice(2) : candidate;
    return validator === etag;
  });
}
