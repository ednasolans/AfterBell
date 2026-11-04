import { supabase } from "@/lib/supabase";

import { type ProfileRow } from "./toCatalogProvider";

// Approved profiles by provider id. Only these providers can show activities
// to customers. Without ids it returns every approved profile.
// Customers cannot read provider_profiles: the function returns only the
// approved text, never a candidate that is still being reviewed.
export async function fetchApprovedProfiles(
  providerIds?: string[],
): Promise<Map<string, ProfileRow>> {
  const { data, error } = await supabase.rpc(
    "public_approved_provider_profiles",
  );
  if (error) {
    throw new Error(error.message);
  }
  const rows = providerIds
    ? data.filter((row) => providerIds.includes(row.provider_id))
    : data;
  return new Map(rows.map((row) => [row.provider_id, row]));
}
