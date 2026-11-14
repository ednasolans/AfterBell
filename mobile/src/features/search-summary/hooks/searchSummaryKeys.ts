import { normalizeSummaryFilters, type SearchSummaryFilters } from "../types";

// One cache entry per search: "Swimming " and "swimming" share the summary
export const searchSummaryKeys = {
  all: ["search-summary"] as const,
  forFilters: (filters: SearchSummaryFilters) =>
    [...searchSummaryKeys.all, normalizeSummaryFilters(filters)] as const,
};
