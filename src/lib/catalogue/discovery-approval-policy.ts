/**
 * Conservative gate for discovery research.
 *
 * A passing result means "ready for a maintainer to inspect", never verified,
 * approved, or published. A fetched marketing page is not proof that an API
 * exists, works, is official, or may be redistributed.
 */
export type DiscoveryResearchLink = {
  kind?: string;
  url?: string;
  linkText?: string;
};

export type DiscoveryResearchSnapshot = {
  hostname?: string;
  research?: {
    fetchStatus?: string;
    httpStatus?: number | null;
    resolvedUrl?: string | null;
    title?: string;
    description?: string;
    candidateLinks?: DiscoveryResearchLink[];
    error?: string | null;
  };
};

export type DiscoveryApprovalInput = {
  name: string;
  originalUrl: string;
  canonicalUrl: string;
  disposition: string;
  automatedResearch: unknown;
};

export type DiscoveryApprovalDecision = {
  decision: "READY_FOR_MAINTAINER_REVIEW" | "REVIEW_REQUIRED";
  score: number;
  checks: Array<{ key: string; passed: boolean; detail: string }>;
  blockers: string[];
  requiresHumanApproval: true;
  mayPublish: false;
};

function safeHttpUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") ||
        url.username || url.password || !url.hostname || url.port && !/^\d+$/.test(url.port)) return null;
    return url;
  } catch {
    return null;
  }
}

function asSnapshot(value: unknown): DiscoveryResearchSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as DiscoveryResearchSnapshot;
}

/**
 * Scores only observable research hygiene. It deliberately does not infer
 * API functionality, provider ownership, acceptable terms, or endpoint health.
 */
export function evaluateDiscoveryApproval(input: DiscoveryApprovalInput): DiscoveryApprovalDecision {
  const snapshot = asSnapshot(input.automatedResearch);
  const research = snapshot?.research;
  const original = safeHttpUrl(input.originalUrl);
  const canonical = safeHttpUrl(input.canonicalUrl);
  const resolved = safeHttpUrl(research?.resolvedUrl);
  const links = Array.isArray(research?.candidateLinks) ? research.candidateLinks : [];

  const docs = links.filter((link) => {
    if (typeof link?.kind !== "string" || !/doc|api reference|developer/i.test(link.kind)) return false;
    const url = safeHttpUrl(link.url);
    return Boolean(url && canonical && url.protocol === "https:" && url.hostname === canonical.hostname);
  });

  const checks = [
    { key: "valid_identity", passed: Boolean(input.name.trim() && original && canonical), detail: "Name and source URLs must be valid HTTP(S) URLs without embedded credentials." },
    { key: "https_canonical", passed: canonical?.protocol === "https:", detail: "Canonical provider URL must use HTTPS." },
    { key: "successful_fetch", passed: research?.fetchStatus === "FETCHED" && Number.isInteger(research.httpStatus) && research.httpStatus! >= 200 && research.httpStatus! < 300, detail: "Official page fetch must return a successful 2xx response." },
    { key: "same_host_resolution", passed: Boolean(canonical && resolved && canonical.hostname === resolved.hostname && resolved.protocol === "https:"), detail: "Final resolved page must remain on the canonical HTTPS hostname." },
    { key: "page_identity", passed: Boolean(research?.title?.trim() && research?.description?.trim()), detail: "Fetched page must expose both a title and description for identity review." },
    { key: "official_docs_link", passed: docs.length > 0, detail: "At least one HTTPS documentation link on the canonical hostname must be found." },
  ];
  const blockers = checks.filter((check) => !check.passed).map((check) => check.detail);
  const score = Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);
  const ready = blockers.length === 0 && input.disposition === "READY_FOR_MAINTAINER_REVIEW";

  return {
    decision: ready ? "READY_FOR_MAINTAINER_REVIEW" : "REVIEW_REQUIRED",
    score,
    checks,
    blockers,
    requiresHumanApproval: true,
    mayPublish: false,
  };
}
