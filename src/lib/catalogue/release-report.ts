export type CatalogueReleaseCandidate = {
  slug: string;
  name: string;
  status: string;
  verificationStatus: string;
  publishedAt: Date | string | null;
  provider: { name: string } | null;
  categories: Array<{ category: { name: string } | null }>;
  sources: Array<{ url: string; isOfficial: boolean }>;
};

export type CatalogueReleaseReport = {
  generatedAt: string;
  totalRecords: number;
  eligibleCount: number;
  excludedCount: number;
  criteria: string[];
  categoryBreakdown: Array<{ category: string; count: number }>;
  providerBreakdown: Array<{ provider: string; count: number }>;
  excludedByReason: Record<string, number>;
  eligibleApis: Array<{ slug: string; name: string; provider: string }>;
  caveat: string;
};

function isOfficialHttpsSource(url: string) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function identityPart(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

export function buildCatalogueReleaseReport(
  records: CatalogueReleaseCandidate[],
  generatedAt: Date = new Date(),
): CatalogueReleaseReport {
  const seenIdentities = new Set<string>();
  const categoryCounts = new Map<string, number>();
  const providerCounts = new Map<string, number>();
  const excludedByReason: Record<string, number> = {};
  const eligibleApis: CatalogueReleaseReport["eligibleApis"] = [];

  for (const api of records) {
    const reasons: string[] = [];
    const provider = api.provider?.name.trim() ?? "";

    if (api.status !== "ACTIVE") reasons.push("not_active");
    if (api.verificationStatus !== "VERIFIED") reasons.push("not_verified");
    if (!api.publishedAt) reasons.push("not_published");
    if (!provider) reasons.push("missing_provider");
    if (api.categories.length === 0) reasons.push("missing_category");
    if (!api.sources.some((source) => source.isOfficial && isOfficialHttpsSource(source.url))) {
      reasons.push("missing_official_https_source");
    }

    const identity = `${identityPart(provider)}::${identityPart(api.name)}`;
    if (reasons.length === 0 && seenIdentities.has(identity)) {
      reasons.push("duplicate_provider_name");
    }

    if (reasons.length > 0) {
      for (const reason of reasons) {
        excludedByReason[reason] = (excludedByReason[reason] ?? 0) + 1;
      }
      continue;
    }

    seenIdentities.add(identity);
    eligibleApis.push({ slug: api.slug, name: api.name, provider });
    providerCounts.set(provider, (providerCounts.get(provider) ?? 0) + 1);

    for (const category of api.categories) {
      const name = category.category?.name.trim();
      if (name) categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1);
    }
  }

  return {
    generatedAt: generatedAt.toISOString(),
    totalRecords: records.length,
    eligibleCount: eligibleApis.length,
    excludedCount: records.length - eligibleApis.length,
    criteria: [
      "ACTIVE status",
      "VERIFIED verification status",
      "publishedAt is set",
      "provider is present",
      "at least one category is assigned",
      "at least one official HTTPS source is recorded",
      "duplicate provider + API-name identities are counted once",
    ],
    categoryBreakdown: [...categoryCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category)),
    providerBreakdown: [...providerCounts.entries()]
      .map(([provider, count]) => ({ provider, count }))
      .sort((a, b) => a.provider.localeCompare(b.provider)),
    excludedByReason,
    eligibleApis: eligibleApis.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name)),
    caveat: "This report applies mechanical publication and evidence gates. Maintainers must still review provider identity, mirrors, aliases, source terms, and whether each record represents a distinct API product rather than an endpoint, version, or duplicate listing.",
  };
}
