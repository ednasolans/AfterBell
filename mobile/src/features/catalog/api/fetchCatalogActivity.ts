import { toActivity } from "@/lib/activity";
import { formatAddress, toAddress } from "@/lib/addresses";
import { supabase } from "@/lib/supabase";

import { type CatalogActivityDetail } from "../types";
import { fetchApprovedProfiles } from "./fetchApprovedProfiles";
import { fetchContacts } from "./fetchContacts";
import { toCatalogProvider } from "./toCatalogProvider";

// The address is a nice-to-have: if it cannot be read, the detail is shown without it
async function fetchAddress(addressId: string): Promise<string | null> {
  const { data } = await supabase
    .from("addresses")
    .select("*")
    .eq("id", addressId)
    .maybeSingle();
  return data ? formatAddress(toAddress(data)) : null;
}

// Accepted enrolment requests. Like the address, it is not essential for the
// detail, so a failure hides the counter instead of the whole screen.
async function fetchEnrolledCount(activityId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("activity_capacity", {
    p_activity_id: activityId,
  });
  if (error) {
    return null;
  }
  return data[0]?.taken_places ?? 0;
}

// One published activity with its provider and address. It is null when the
// activity does not exist, is not published or its provider has no approved
// profile.
export async function fetchCatalogActivity(
  id: string,
): Promise<CatalogActivityDetail | null> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const activity = toActivity(data);
  const [profiles, contacts, address, enrolledCount] = await Promise.all([
    fetchApprovedProfiles([activity.providerId]),
    fetchContacts([activity.providerId]),
    fetchAddress(activity.addressId),
    fetchEnrolledCount(activity.id),
  ]);

  const profile = profiles.get(activity.providerId);
  if (!profile) {
    return null;
  }

  return {
    activity,
    provider: toCatalogProvider(
      profile,
      contacts.get(activity.providerId) ?? null,
    ),
    address,
    enrolledCount,
  };
}
