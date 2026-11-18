import { type SearchFilters } from "@/lib/searchFilters";

// Query keys of the catalog (what customers see), defined once so every hook uses the same ones.
export const catalogKeys = {
  all: ["catalog"] as const,
  list: () => [...catalogKeys.all, "list"] as const,
  detail: (id: string) => [...catalogKeys.all, "detail", id] as const,
  favourites: () => [...catalogKeys.all, "favourites"] as const,
  // Every search, to update them all at once
  searches: () => [...catalogKeys.all, "search"] as const,
  search: (query: string, filters: SearchFilters) =>
    [...catalogKeys.searches(), query, filters] as const,
  searchCount: (query: string, filters: SearchFilters) =>
    [...catalogKeys.all, "search-count", query, filters] as const,
};
