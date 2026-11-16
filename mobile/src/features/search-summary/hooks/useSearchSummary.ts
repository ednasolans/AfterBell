import { useQuery } from "@tanstack/react-query";

import { fetchSearchSummary } from "../api/fetchSearchSummary";
import { type SearchSummaryFilters } from "../types";
import { searchSummaryKeys } from "./searchSummaryKeys";

// Same time as the cache of the Edge Function
export const SEARCH_SUMMARY_STALE_MS = 30 * 60_000;

// AI summary of the current search. Each search has its own key, so an answer
// that arrives after the customer changed the search is never shown for the
// new one. `enabled` is false until the results are loaded and not empty.
export function useSearchSummary(
  filters: SearchSummaryFilters,
  enabled: boolean,
) {
  return useQuery({
    queryKey: searchSummaryKeys.forFilters(filters),
    queryFn: ({ signal }) => fetchSearchSummary(filters, signal),
    enabled,
    staleTime: SEARCH_SUMMARY_STALE_MS,
    // A summary is optional: if it fails, the block is hidden, no retries
    retry: false,
  });
}
