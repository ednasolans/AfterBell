import { type PricePeriod } from "@/lib/price";

// Filters of the activity search (search_activities). The catalog search and
// the AI summary of a search use the same ones. null (or an empty list of
// categories) means the filter is not applied.
export interface SearchFilters {
  // Names of the category catalogue
  categories: string[];
  // Requested ages in years: an activity matches when its age ranges overlap them
  ageMin: number | null;
  ageMax: number | null;
  city: string | null;
  postalCode: string | null;
  // Prices are only compared within one period, so they need pricePeriod
  priceMin: number | null;
  priceMax: number | null;
  pricePeriod: PricePeriod | null;
}

export const NO_SEARCH_FILTERS: SearchFilters = {
  categories: [],
  ageMin: null,
  ageMax: null,
  city: null,
  postalCode: null,
  priceMin: null,
  priceMax: null,
  pricePeriod: null,
};
