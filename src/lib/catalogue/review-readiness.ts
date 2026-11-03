type ReviewSource = { sourceKind: string; url: string; isOfficial: boolean };
type ReviewReadinessInput = {
  homepageUrl: string;
  documentationUrl: string | null;
  pricingModel: string;
  pricingSummary: string | null;
  categories: { categoryId: string }[];
  authMethods: { method: string }[];
  sources: ReviewSource[];
};

export function getApiReviewReadiness(api: ReviewReadinessInput) {
  const gaps: string[] = [];
  const officialHomepage = api.sources.some(
    (source) =>
      source.sourceKind === "OFFICIAL_HOMEPAGE" &&
      source.isOfficial &&
      source.url === api.homepageUrl,
  );

  if (!officialHomepage) gaps.push("official homepage source missing");
  if (api.documentationUrl && !api.sources.some(
    (source) => source.sourceKind === "DOCUMENTATION" && source.url === api.documentationUrl,
  )) {
    gaps.push("documentation source missing");
  }
  if ((api.pricingSummary || api.pricingModel !== "UNKNOWN") && !api.sources.some(
    (source) => source.sourceKind === "PRICING",
  )) {
    gaps.push("pricing evidence missing");
  }
  if (api.categories.length === 0) gaps.push("category missing");
  if (api.authMethods.length === 0) gaps.push("authentication classification missing");

  return { ready: gaps.length === 0, gaps };
}
