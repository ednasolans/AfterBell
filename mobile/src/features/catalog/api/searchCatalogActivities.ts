import { NO_SEARCH_FILTERS, type SearchFilters } from "@/lib/searchFilters";
import { supabase } from "@/lib/supabase";

import { type CatalogActivity } from "../types";
import { fetchApprovedProfiles } from "./fetchApprovedProfiles";
import { fetchContacts } from "./fetchContacts";
import { searchActivities } from "./searchActivities";
import { toCatalogProvider } from "./toCatalogProvider";

// Ids of the given activities that the customer saved. RLS only returns the
// customer's own favourites.
async function fetchSavedIds(activityIds: string[]): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("favourites")
    .select("activity_id")
    .in("activity_id", activityIds);
  if (error) {
    throw new Error(error.message);
  }
  return new Set(data.map((row) => row.activity_id));
}

// One page of the search, each activity with its provider and whether the
// customer saved it, so the results use the same card as the catalog list.
// The order is the relevance of searchActivities.
export async function searchCatalogActivities(
  query: string,
  filters: SearchFilters = NO_SEARCH_FILTERS,
  page = 0,
): Promise<CatalogActivity[]> {
  const activities = await searchActivities(query, filters, page);
  if (activities.length === 0) {
    return [];
  }

  const providerIds = Array.from(
    new Set(activities.map((activity) => activity.providerId)),
  );
  const [profiles, contacts, saved] = await Promise.all([
    fetchApprovedProfiles(providerIds),
    fetchContacts(providerIds),
    fetchSavedIds(activities.map((activity) => activity.id)),
  ]);

  // The search already requires an approved profile, but an activity is never
  // shown without one, whatever the database returns
  return activities.flatMap((activity) => {
    const profile = profiles.get(activity.providerId);
    if (!profile) {
      return [];
    }
    return [
      {
        activity,
        provider: toCatalogProvider(
          profile,
          contacts.get(activity.providerId) ?? null,
        ),
        isFavourite: saved.has(activity.id),
      },
    ];
  });
}
