import { AUTH_OPTIONS, PRICING_OPTIONS } from "@/lib/catalogue/constants";

export type PricingFilter = "ALL" | (typeof PRICING_OPTIONS)[number]["value"];
export type AuthFilter = "ALL" | (typeof AUTH_OPTIONS)[number]["value"];
export type SortOption = "relevance" | "recent" | "verified" | "newest" | "name";

export type CatalogueFilters = {
  q: string;
  category: string;
  pricing: PricingFilter;
  auth: AuthFilter;
  sort: SortOption;
  page: number;
  limit: number;
};

type SearchInput = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function oneOf<T extends string>(value: string, options: readonly { value: T }[]): T | "ALL" {
  return options.some((option) => option.value === value) ? (value as T) : "ALL";
}

export function tokenizeCatalogueQuery(query: string): string[] {
  return [...new Set(query.toLocaleLowerCase().trim().split(/\\s+/).filter(Boolean))].slice(0, 8);
}

export type SearchableCatalogueRecord = {
  name: string;
  slug: string;
  summary: string;
  description: string | null;
  provider: { name: string; slug: string };
  categories: { category: { name: string; slug: string } }[];
  tags: { tag: { name: string; slug: string } }[];
  featured: boolean;
  verifiedAt: Date | null;
  updatedAt: Date;
};

function relevanceScore(api: SearchableCatalogueRecord, query: string, tokens: string[]): number {
  const normalize = (value: string | null | undefined) => (value ?? "").toLocaleLowerCase();
  const name = normalize(api.name);
  const slug = normalize(api.slug);
  const provider = normalize(api.provider.name);
  const providerSlug = normalize(api.provider.slug);
  const summary = normalize(api.summary);
  const description = normalize(api.description);
  const categories = api.categories.flatMap(({ category }) => [normalize(category.name), normalize(category.slug)]);
  const tags = api.tags.flatMap(({ tag }) => [normalize(tag.name), normalize(tag.slug)]);
  const phrase = query.toLocaleLowerCase();

  let score = 0;
  if (name === phrase) score += 1_000;
  else if (name.startsWith(phrase)) score += 750;
  else if (name.includes(phrase)) score += 500;
  if (provider === phrase) score += 450;
  else if (provider.startsWith(phrase)) score += 350;
  else if (provider.includes(phrase)) score += 250;
  if (slug === phrase) score += 300;
  else if (slug.includes(phrase) || providerSlug.includes(phrase)) score += 180;
  if (categories.some((value) => value === phrase)) score += 160;
  else if (categories.some((value) => value.includes(phrase))) score += 120;
  if (tags.some((value) => value.includes(phrase))) score += 100;
  if (summary.includes(phrase)) score += 80;
  if (description.includes(phrase)) score += 40;

  for (const token of tokens) {
    if (name.includes(token)) score += 30;
    else if (provider.includes(token) || providerSlug.includes(token)) score += 22;
    else if (slug.includes(token)) score += 18;
    else if (categories.some((value) => value.includes(token))) score += 14;
    else if (tags.some((value) => value.includes(token))) score += 12;
    else if (summary.includes(token)) score += 8;
    else if (description.includes(token)) score += 4;
  }
  return score;
}

export function rankCatalogueResults<T extends SearchableCatalogueRecord>(items: T[], query: string): T[] {
  const normalizedQuery = query.toLocaleLowerCase().trim();
  const tokens = tokenizeCatalogueQuery(normalizedQuery);
  return [...items].sort((left, right) => {
    const scoreDifference = relevanceScore(right, normalizedQuery, tokens) - relevanceScore(left, normalizedQuery, tokens);
    if (scoreDifference !== 0) return scoreDifference;
    if (left.featured !== right.featured) return left.featured ? -1 : 1;
    const verifiedDifference = (right.verifiedAt?.getTime() ?? 0) - (left.verifiedAt?.getTime() ?? 0);
    if (verifiedDifference !== 0) return verifiedDifference;
    const updatedDifference = right.updatedAt.getTime() - left.updatedAt.getTime();
    if (updatedDifference !== 0) return updatedDifference;
    return left.name.localeCompare(right.name);
  });
}

export function parseCatalogueFilters(input: SearchInput, defaultLimit = 12): CatalogueFilters {
  const rawPage = Number.parseInt(first(input.page), 10);
  const rawLimit = Number.parseInt(first(input.limit), 10);
  const sort = first(input.sort);
  const supportedSorts: readonly SortOption[] = ["relevance", "recent", "verified", "newest", "name"];

  return {
    q: first(input.q).trim().replace(/\\s+/g, " ").slice(0, 100),
    category: first(input.category).trim().toLowerCase().slice(0, 100),
    pricing: oneOf(first(input.pricing), PRICING_OPTIONS),
    auth: oneOf(first(input.auth), AUTH_OPTIONS),
    sort: supportedSorts.includes(sort as SortOption) ? (sort as SortOption) : "relevance",
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.min(rawPage, 10_000) : 1,
    limit: Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : defaultLimit,
  };
}
