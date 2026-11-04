const SOURCE_FRESHNESS_DAYS = 180;
const millisecondsPerDay = 24 * 60 * 60 * 1000;

type ReviewSource = {
  sourceKind: string;
  url: string;
  isOfficial: boolean;
  checkedAt: Date | null;
};

type ReviewReadinessInput = {
  homepageUrl: string;
  documentationUrl: string | null;
  pricingModel: string;
  pricingSummary: string | null;
  categories: { categoryId: string }[];
  authMethods: { method: string }[];
  sources: ReviewSource[];
};

export function getApiReviewReadiness(api: ReviewReadinessInput, now = new Date()) {
  const gaps: string[] = [];
  const officialSources = api.sources.filter((source) => source.isOfficial);
  const officialHomepage = officialSources.some(
    (source) => source.sourceKind === "OFFICIAL_HOMEPAGE" && source.url === api.homepageUrl,
  );

  if (!officialHomepage) gaps.push("official homepage source missing");

  if (api.documentationUrl && !api.sources.some(
    (source) =>
      source.sourceKind === "DOCUMENTATION" &&
      source.isOfficial &&
      source.url === api.documentationUrl,
  )) {
    gaps.push("official documentation source missing");
  }

  if ((api.pricingSummary || api.pricingModel !== "UNKNOWN") && !api.sources.some(
    (source) => source.sourceKind === "PRICING" && source.isOfficial,
  )) {
    gaps.push("official pricing evidence missing");
  }

  if (
    api.authMethods.some((item) => item.method !== "UNKNOWN") &&
    !api.sources.some((source) => source.sourceKind === "AUTHENTICATION" && source.isOfficial)
  ) {
    gaps.push("official authentication evidence missing");
  }

  if (officialSources.some((source) => source.checkedAt === null)) {
    gaps.push("official source review date missing");
  }

  const freshnessCutoff = now.getTime() - SOURCE_FRESHNESS_DAYS * millisecondsPerDay;
  if (officialSources.some(
    (source) => source.checkedAt !== null && source.checkedAt.getTime() < freshnessCutoff,
  )) {
    gaps.push(`official source evidence older than ${SOURCE_FRESHNESS_DAYS} days`);
  }

  if (api.categories.length === 0) gaps.push("category missing");
  if (api.authMethods.length === 0) gaps.push("authentication classification missing");

  return { ready: gaps.length === 0, gaps };
}
