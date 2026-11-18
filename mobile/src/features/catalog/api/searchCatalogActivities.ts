import { NO_SEARCH_FILTERS, type SearchFilters } from "@/lib/searchFilters";
import { supabase } from "@/lib/supabase";

import { type CatalogActivity } from "../types";
import { fetchApprovedProfiles } from "./fetchApprovedProfiles";
import { fetchContacts } from "./fetchContacts";
import { searchActivities } from "./searchActivities";
import { toCatalogProvider } from "./toCatalogProvider";

// Ids of the given activities that the family profile saved. Without a
// profile, nothing is saved.
async function fetchSavedIds(
  activityIds: string[],
  familyProfileId: string | null,
): Promise<Set<string>> {
  if (!familyProfileId) {
    return new Set();
  }
  const { data, error } = await supabase
    .from("favourites")
    .select("activity_id")
    .eq("family_profile_id", familyProfileId)
    .in("activity_id", activityIds);
  if (error) {
    throw new Error(error.message);
  }
  return new Set(data.map((row) => row.activity_id));
}

// One page of the search, each activity with its provider and whether the
// family profile saved it, so the results use the same card as the catalog
// list. The order is the relevance of searchActivities.
export async function searchCatalogActivities(
  query: string,
  filters: SearchFilters = NO_SEARCH_FILTERS,
  page = 0,
  familyProfileId: string | null = null,
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
    fetchSavedIds(
      activities.map((activity) => activity.id),
      familyProfileId,
    ),
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
