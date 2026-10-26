import { toActivity } from "@/lib/activity";
import { supabase } from "@/lib/supabase";

import { type CatalogActivity } from "../types";
import { fetchApprovedProfiles } from "./fetchApprovedProfiles";
import { fetchContacts } from "./fetchContacts";
import { toCatalogProvider } from "./toCatalogProvider";

// The activities of the providers that have an approved profile,
// newest first, each with the profile and contact details of its provider.
export async function fetchCatalogActivities(): Promise<CatalogActivity[]> {
  const profiles = await fetchApprovedProfiles();
  if (profiles.size === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .in("provider_id", Array.from(profiles.keys()))
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }

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
      },
    ];
  });
}
