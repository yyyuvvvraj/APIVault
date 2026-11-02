import type { ApiCardRecord, ApiDetailRecord } from "@/lib/catalogue/queries";

export function toPublicApiCard(api: ApiCardRecord) {
  return {
    id: api.id,
    slug: api.slug,
    name: api.name,
    summary: api.summary,
    provider: api.provider,
    homepageUrl: api.homepageUrl,
    documentationUrl: api.documentationUrl,
    pricingModel: api.pricingModel,
    categories: api.categories.map(({ category }) => category),
    tags: api.tags.map(({ tag }) => tag),
    authMethods: api.authMethods,
    verifiedAt: api.verifiedAt,
    lastCheckedAt: api.lastCheckedAt,
  };
}

export function toPublicApiDetail(api: ApiDetailRecord) {
  return {
    ...toPublicApiCard(api),
    description: api.description,
    baseUrl: api.baseUrl,
    pricingSummary: api.pricingSummary,
    provider: api.provider,
    verification: {
      status: api.verificationStatus,
      verifiedAt: api.verifiedAt,
      lastCheckedAt: api.lastCheckedAt,
    },
    sources: api.sources.map((source) => ({
      id: source.id,
      kind: source.sourceKind,
      url: source.url,
      title: source.title,
      isOfficial: source.isOfficial,
      notes: source.notes,
      checkedAt: source.checkedAt,
    })),
    rateLimits: api.rateLimits.map((limit) => ({
      id: limit.id,
      description: limit.description,
      requestCount: limit.requestCount,
      windowSeconds: limit.windowSeconds,
      scope: limit.scope,
      sourceUrl: limit.source?.url ?? null,
    })),
    pricingPlans: api.pricingPlans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      priceAmount: plan.priceAmount?.toString() ?? null,
      currency: plan.currency,
      billingInterval: plan.billingInterval,
      isFreeTier: plan.isFreeTier,
      sourceUrl: plan.source?.url ?? null,
    })),
  };
}
