import { type Activity, toActivity } from "@/lib/activity";
import { supabase } from "@/lib/supabase";

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;
export const SEARCH_PAGE_SIZE = 20;

export const SEARCH_TOO_SHORT_MESSAGE = `Type at least ${SEARCH_MIN_LENGTH} characters to search.`;
export const SEARCH_TOO_LONG_MESSAGE = `The search can have at most ${SEARCH_MAX_LENGTH} characters.`;

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

function toSearchError(message: string): Error {
  if (message === "search_query_too_short") {
    return new Error(SEARCH_TOO_SHORT_MESSAGE);
  }
  if (message === "search_query_too_long") {
    return new Error(SEARCH_TOO_LONG_MESSAGE);
  }
  return new Error(message);
}

// One page of published activities (tutor offers included) that match the
// text, most relevant first. Page 0 is the first page.
export async function searchActivities(
  query: string,
  page = 0,
): Promise<Activity[]> {
  const invalid = validateSearchQuery(query);
  if (invalid) {
    throw new Error(invalid);
  }
  const { data, error } = await supabase.rpc("search_activities", {
    p_query: trimSearchQuery(query),
    p_limit: SEARCH_PAGE_SIZE,
    p_offset: page * SEARCH_PAGE_SIZE,
  });
  if (error) {
    throw toSearchError(error.message);
  }
  return data.map((row) => toActivity(row));
}
