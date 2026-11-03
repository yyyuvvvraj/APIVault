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

export function parseCatalogueFilters(input: SearchInput, defaultLimit = 12): CatalogueFilters {
  const rawPage = Number.parseInt(first(input.page), 10);
  const rawLimit = Number.parseInt(first(input.limit), 10);
  const sort = first(input.sort);
  const supportedSorts: readonly SortOption[] = ["relevance", "recent", "verified", "newest", "name"];

  return {
    q: first(input.q).trim().slice(0, 100),
    category: first(input.category).trim().toLowerCase().slice(0, 100),
    pricing: oneOf(first(input.pricing), PRICING_OPTIONS),
    auth: oneOf(first(input.auth), AUTH_OPTIONS),
    sort: supportedSorts.includes(sort as SortOption) ? (sort as SortOption) : "relevance",
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.min(rawPage, 10_000) : 1,
    limit: Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : defaultLimit,
  };
}
