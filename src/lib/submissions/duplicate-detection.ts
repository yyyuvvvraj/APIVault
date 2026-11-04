export type DuplicateCandidate = {
  id: string;
  slug: string;
  name: string;
  homepageUrl: string;
  provider: { name: string };
};

export type DuplicateSubmissionInput = {
  name?: unknown;
  providerName?: unknown;
  homepageUrl?: unknown;
};

export function normalizeHomepageUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const hostname = url.hostname.toLowerCase().replace(/^www\\./, "");
    const pathname = url.pathname.replace(/\\/+$/, "") || "/";
    return `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ""}${pathname}`;
  } catch {
    return null;
  }
}

export function findSubmissionDuplicateCandidates(
  input: DuplicateSubmissionInput,
  candidates: DuplicateCandidate[],
  targetApiId?: string | null,
) {
  const name = typeof input.name === "string" ? input.name.trim().toLocaleLowerCase() : "";
  const providerName = typeof input.providerName === "string" ? input.providerName.trim().toLocaleLowerCase() : "";
  const homepage = typeof input.homepageUrl === "string" ? normalizeHomepageUrl(input.homepageUrl) : null;

  return candidates.flatMap((candidate) => {
    if (candidate.id === targetApiId) return [];
    const sameNameAndProvider = Boolean(name && providerName)
      && candidate.name.trim().toLocaleLowerCase() === name
      && candidate.provider.name.trim().toLocaleLowerCase() === providerName;
    const sameHomepage = Boolean(homepage)
      && normalizeHomepageUrl(candidate.homepageUrl) === homepage;
    if (!sameNameAndProvider && !sameHomepage) return [];
    return [{
      id: candidate.id,
      slug: candidate.slug,
      name: candidate.name,
      providerName: candidate.provider.name,
      reason: sameHomepage && sameNameAndProvider
        ? "Homepage and provider/name match"
        : sameHomepage ? "Homepage URL match" : "Provider and API name match",
    }];
  });
}
