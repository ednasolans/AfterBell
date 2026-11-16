// Filters sent to the summarize-search Edge Function. They are the same
// filters as the search, so the function can run the same search again.
export type SearchSummaryFilters = {
  query: string | null;
  category: string | null;
  city: string | null;
  priceMin: number | null;
  priceMax: number | null;
};

// READY: there is a summary. The other statuses hide the block.
export type SearchSummaryResult =
  | { status: "READY"; summary: string }
  | { status: "NO_RESULTS" | "UNAVAILABLE" | "RATE_LIMITED" };

// Same search -> same filters: no case, no extra spaces, empty text is null
export function normalizeSummaryFilters(
  filters: SearchSummaryFilters,
): SearchSummaryFilters {
  const text = (value: string | null) => {
    const clean = value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
    return clean === "" ? null : clean;
  };
  return {
    query: text(filters.query),
    category: text(filters.category),
    city: text(filters.city),
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
  };
}
