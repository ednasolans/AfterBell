import { type Activity, toActivity } from "@/lib/activity";
import { NO_SEARCH_FILTERS, type SearchFilters } from "@/lib/searchFilters";
import { supabase } from "@/lib/supabase";

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;
export const SEARCH_PAGE_SIZE = 20;

export const SEARCH_TOO_SHORT_MESSAGE = `Type at least ${SEARCH_MIN_LENGTH} characters to search.`;
export const SEARCH_TOO_LONG_MESSAGE = `The search can have at most ${SEARCH_MAX_LENGTH} characters.`;

// The message for each error that search_activities raises for invalid values
export const SEARCH_ERROR_MESSAGES: Record<string, string> = {
  search_query_too_short: SEARCH_TOO_SHORT_MESSAGE,
  search_query_too_long: SEARCH_TOO_LONG_MESSAGE,
  search_unknown_category: "One of the selected categories does not exist.",
  search_negative_age: "Ages cannot be negative.",
  search_invalid_age_range:
    "The minimum age cannot be higher than the maximum age.",
  search_negative_price: "Prices cannot be negative.",
  search_invalid_price_range:
    "The minimum price cannot be higher than the maximum price.",
  search_unknown_price_period: "The price period is not valid.",
  search_price_period_required: "Choose a price period to filter by price.",
};

// The text of the search with the spaces removed from both ends; '' means
// "no text", so every published activity is returned
export function trimSearchQuery(query: string): string {
  return query.trim();
}

// null when the text can be searched, otherwise the message for the customer.
// The database checks the same limits: this only avoids a useless request.
export function validateSearchQuery(query: string): string | null {
  const length = trimSearchQuery(query).length;
  if (length === 0) {
    return null;
  }
  if (length < SEARCH_MIN_LENGTH) {
    return SEARCH_TOO_SHORT_MESSAGE;
  }
  return length > SEARCH_MAX_LENGTH ? SEARCH_TOO_LONG_MESSAGE : null;
}

// Error code when the minimum or maximum is negative, or the minimum is higher
function validateRange(
  min: number | null,
  max: number | null,
  codes: { negative: string; invalid: string },
): string | null {
  if ((min !== null && min < 0) || (max !== null && max < 0)) {
    return codes.negative;
  }
  return min !== null && max !== null && min > max ? codes.invalid : null;
}

export type SearchFilterErrors = { age?: string; price?: string };

// The message for the customer of each invalid range, to show it next to its
// fields. The database checks the same rules, and also that the categories exist.
export function searchFilterErrors(filters: SearchFilters): SearchFilterErrors {
  const errors: SearchFilterErrors = {};
  const ageCode = validateRange(filters.ageMin, filters.ageMax, {
    negative: "search_negative_age",
    invalid: "search_invalid_age_range",
  });
  if (ageCode) {
    errors.age = SEARCH_ERROR_MESSAGES[ageCode];
  }
  const hasPrice = filters.priceMin !== null || filters.priceMax !== null;
  const priceCode =
    validateRange(filters.priceMin, filters.priceMax, {
      negative: "search_negative_price",
      invalid: "search_invalid_price_range",
    }) ??
    (hasPrice && filters.pricePeriod === null
      ? "search_price_period_required"
      : null);
  if (priceCode) {
    errors.price = SEARCH_ERROR_MESSAGES[priceCode];
  }
  return errors;
}

// null when the filters can be sent, otherwise the message for the customer
export function validateSearchFilters(filters: SearchFilters): string | null {
  const errors = searchFilterErrors(filters);
  return errors.age ?? errors.price ?? null;
}

// Blank text is no filter: sent as undefined, so it is left out of the request
function textFilter(value: string | null): string | undefined {
  const text = value?.trim() ?? "";
  return text === "" ? undefined : text;
}

// The arguments of search_activities and count_search_activities for a text
// and filters. Throws the message for the customer when they are not valid.
function toSearchArgs(query: string, filters: SearchFilters) {
  const invalid = validateSearchQuery(query) ?? validateSearchFilters(filters);
  if (invalid) {
    throw new Error(invalid);
  }
  return {
    p_query: trimSearchQuery(query),
    p_categories:
      filters.categories.length > 0 ? filters.categories : undefined,
    p_age_min: filters.ageMin ?? undefined,
    p_age_max: filters.ageMax ?? undefined,
    p_city: textFilter(filters.city),
    p_postal_code: textFilter(filters.postalCode),
    p_price_min: filters.priceMin ?? undefined,
    p_price_max: filters.priceMax ?? undefined,
    p_price_period: filters.pricePeriod ?? undefined,
  };
}

function toSearchError(error: { message: string }): Error {
  return new Error(SEARCH_ERROR_MESSAGES[error.message] ?? error.message);
}

// One page of published activities (tutor offers included) of providers with
// an approved profile that match the text and every filter, most relevant
// first. Page 0 is the first page.
export async function searchActivities(
  query: string,
  filters: SearchFilters = NO_SEARCH_FILTERS,
  page = 0,
): Promise<Activity[]> {
  const { data, error } = await supabase.rpc("search_activities", {
    ...toSearchArgs(query, filters),
    p_limit: SEARCH_PAGE_SIZE,
    p_offset: page * SEARCH_PAGE_SIZE,
  });
  if (error) {
    throw toSearchError(error);
  }
  return data.map((row) => toActivity(row));
}

// How many activities searchActivities finds, across every page
export async function countSearchActivities(
  query: string,
  filters: SearchFilters = NO_SEARCH_FILTERS,
): Promise<number> {
  const { data, error } = await supabase.rpc(
    "count_search_activities",
    toSearchArgs(query, filters),
  );
  if (error) {
    throw toSearchError(error);
  }
  return data;
}
