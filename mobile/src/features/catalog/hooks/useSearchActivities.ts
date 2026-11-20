import { useInfiniteQuery } from "@tanstack/react-query";

import { NO_SEARCH_FILTERS, type SearchFilters } from "@/lib/searchFilters";

import { SEARCH_PAGE_SIZE } from "../api/searchActivities";
import { searchCatalogActivities } from "../api/searchCatalogActivities";
import { useFavouritesProfileId } from "../favouritesProfile";
import { catalogKeys } from "./catalogKeys";

// The pages of a search, loaded one after another. A full page means there
// may be more; a shorter one is the last.
export function useSearchActivities(
  query: string,
  filters: SearchFilters = NO_SEARCH_FILTERS,
  enabled = true,
) {
  const profileId = useFavouritesProfileId();
  return useInfiniteQuery({
    queryKey: catalogKeys.search(profileId, query, filters),
    queryFn: ({ pageParam }) =>
      searchCatalogActivities(query, filters, pageParam, profileId),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === SEARCH_PAGE_SIZE ? allPages.length : undefined,
    enabled,
  });
}
