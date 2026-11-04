import { supabase } from "@/lib/supabase";

import { type ProviderContact } from "../types";
import { toProviderContact } from "./toCatalogProvider";

// Name and contact details of the given providers, by provider id.
// Technical sheets are private: the function returns only these columns, of
// providers with a published activity.
export async function fetchContacts(
  providerIds: string[],
): Promise<Map<string, ProviderContact>> {
  if (providerIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.rpc("public_provider_contacts");
  if (error) {
    throw new Error(error.message);
  }
  return new Map(
    data
      .filter((row) => providerIds.includes(row.provider_id))
      .map((row) => [row.provider_id, toProviderContact(row)]),
  );
}
