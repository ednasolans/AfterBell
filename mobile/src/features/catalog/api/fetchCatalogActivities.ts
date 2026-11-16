import { toActivity } from "@/lib/activity";
import { supabase } from "@/lib/supabase";

import { type CatalogActivity } from "../types";
import { fetchApprovedProfiles } from "./fetchApprovedProfiles";
import { fetchContacts } from "./fetchContacts";
import { toCatalogProvider } from "./toCatalogProvider";

// The published activities of the providers that have an approved profile,
// newest first, each with the profile and contact details of its provider and
// whether the customer saved it. RLS only returns the customer's own
// favourites, so the embedded list is empty or has one row.
export async function fetchCatalogActivities(): Promise<CatalogActivity[]> {
  const profiles = await fetchApprovedProfiles();
  if (profiles.size === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("activities")
    .select("*, favourites(customer_id)")
    .in("provider_id", Array.from(profiles.keys()))
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }

  const favourites = new Set(
    data.filter((row) => row.favourites.length > 0).map((row) => row.id),
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
