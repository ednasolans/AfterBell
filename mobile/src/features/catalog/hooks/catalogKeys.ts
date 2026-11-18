import { type SearchFilters } from "@/lib/searchFilters";

// Query keys of the catalog (what customers see), defined once so every hook uses the same ones.
// Whether an activity is a favourite depends on the family profile, so the
// queries that say it include the profile: each profile has its own cache.
export const catalogKeys = {
  all: ["catalog"] as const,
  list: (profileId: string | null) =>
    [...catalogKeys.all, "list", profileId] as const,
  detail: (id: string, profileId: string | null) =>
    [...catalogKeys.all, "detail", id, profileId] as const,
  favourites: (profileId: string | null) =>
    [...catalogKeys.all, "favourites", profileId] as const,
  // The values to build the filter panel
  availableFilters: () => [...catalogKeys.all, "available-filters"] as const,
  // Every search of a profile, to update them all at once
  searches: (profileId: string | null) =>
    [...catalogKeys.all, "search", profileId] as const,
  search: (profileId: string | null, query: string, filters: SearchFilters) =>
    [...catalogKeys.searches(profileId), query, filters] as const,
  searchCount: (query: string, filters: SearchFilters) =>
    [...catalogKeys.all, "search-count", query, filters] as const,
};
