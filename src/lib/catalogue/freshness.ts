export const CATALOGUE_REVIEW_INTERVAL_DAYS = 90;

export type CatalogueFreshnessState = "NEVER_CHECKED" | "OVERDUE" | "CURRENT";

export function getCatalogueFreshnessState(
  lastCheckedAt: Date | null,
  now: Date,
  intervalDays = CATALOGUE_REVIEW_INTERVAL_DAYS,
): CatalogueFreshnessState {
  if (!lastCheckedAt) return "NEVER_CHECKED";
  const ageMs = now.getTime() - lastCheckedAt.getTime();
  const thresholdMs = intervalDays * 24 * 60 * 60 * 1000;
  return ageMs >= thresholdMs ? "OVERDUE" : "CURRENT";
}

export function getCatalogueReviewDueAt(
  lastCheckedAt: Date,
  intervalDays = CATALOGUE_REVIEW_INTERVAL_DAYS,
): Date {
  return new Date(lastCheckedAt.getTime() + intervalDays * 24 * 60 * 60 * 1000);
}
