import { toActivity } from "@/lib/activity";
import { supabase } from "@/lib/supabase";

import { type CatalogActivity } from "../types";
import { fetchApprovedProfiles } from "./fetchApprovedProfiles";
import { fetchContacts } from "@/lib/providerContacts";
import { toCatalogProvider } from "./toCatalogProvider";

// The published activities of the providers that have an approved profile,
// newest first, each with the profile and contact details of its provider and
// whether the family profile saved it. The embedded favourites are filtered by
// that profile, so the list is empty or has one row. Without a profile,
// nothing is saved.
export async function fetchCatalogActivities(
  familyProfileId: string | null,
): Promise<CatalogActivity[]> {
  const profiles = await fetchApprovedProfiles();
  if (profiles.size === 0) {
    return [];
  }

  let query = supabase
    .from("activities")
    .select("*, favourites(activity_id)")
    .in("provider_id", Array.from(profiles.keys()))
    .eq("status", "published");
  if (familyProfileId) {
    query = query.eq("favourites.family_profile_id", familyProfileId);
  }
  const { data, error } = await query.order("created_at", {
    ascending: false,
  });
  if (error) {
    throw new Error(error.message);
  }

  const favourites = new Set(
    familyProfileId
      ? data.filter((row) => row.favourites.length > 0).map((row) => row.id)
      : [],
  );
  const activities = data.map(toActivity);
  const contacts = await fetchContacts(
    Array.from(new Set(activities.map((activity) => activity.providerId))),
  );

  // The query already filters by provider, but an activity is never shown
  // without an approved profile, whatever the database returns
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
        isFavourite: favourites.has(activity.id),
      },
    ];
  });
}
