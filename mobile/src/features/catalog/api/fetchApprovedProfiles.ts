import { supabase } from "@/lib/supabase";

import { PROFILE_COLUMNS, type ProfileRow } from "./toCatalogProvider";

// Value of provider_profiles.status for a profile the provider has approved
export const APPROVED_PROFILE_STATUS = "approved";

// Approved profiles by provider id. Only these providers can show activities
// to customers. Without ids it returns every approved profile.
export async function fetchApprovedProfiles(
  providerIds?: string[],
): Promise<Map<string, ProfileRow>> {
  let query = supabase
    .from("provider_profiles")
    .select(PROFILE_COLUMNS)
    .eq("status", APPROVED_PROFILE_STATUS);
  if (providerIds) {
    query = query.in("provider_id", providerIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return new Map(data.map((row) => [row.provider_id, row]));
}