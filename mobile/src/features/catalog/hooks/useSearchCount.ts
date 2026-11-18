import { useQuery } from "@tanstack/react-query";

import { NO_SEARCH_FILTERS, type SearchFilters } from "@/lib/searchFilters";

import { countSearchActivities } from "../api/searchActivities";
import { catalogKeys } from "./catalogKeys";

export function useSearchCount(
  query: string,
  filters: SearchFilters = NO_SEARCH_FILTERS,
  enabled = true,
) {
  return useQuery({
    queryKey: catalogKeys.searchCount(query, filters),
    queryFn: () => countSearchActivities(query, filters),
    enabled,
  });
}
