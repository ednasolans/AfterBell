import { toActivity } from "@/features/activities/api/toActivity";
import { PUBLISHED_ACTIVITY_STATUS } from "@/features/activities/types";
import { formatAddress } from "@/lib/addresses";
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
  return data ? formatAddress(data) : null;
}

// One published activity with its provider and address. It is null when the
// activity does not exist, is not published, or its provider has no approved profile.
export async function fetchCatalogActivity(
  id: string,
): Promise<CatalogActivityDetail | null> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("id", id)
    .eq("status", PUBLISHED_ACTIVITY_STATUS)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const activity = toActivity(data);
  const [profiles, contacts, address] = await Promise.all([
    fetchApprovedProfiles([activity.accountId]),
    fetchContacts([activity.accountId]),
    activity.addressId ? fetchAddress(activity.addressId) : Promise.resolve(null),
  ]);

  const profile = profiles.get(activity.accountId);
  if (!profile) {
    return null;
  }

  return {
    activity,
    provider: toCatalogProvider(
      profile,
      contacts.get(activity.accountId) ?? null,
    ),
    address,
  };
}