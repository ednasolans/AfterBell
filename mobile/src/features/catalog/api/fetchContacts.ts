import { supabase } from "@/lib/supabase";

import { type ProviderContact } from "../types";
import { CONTACT_COLUMNS, toProviderContact } from "./toCatalogProvider";

// Name and contact details of the given providers, by provider id
export async function fetchContacts(
  providerIds: string[],
): Promise<Map<string, ProviderContact>> {
  if (providerIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("technical_sheets")
    .select(CONTACT_COLUMNS)
    .in("provider_id", providerIds);
  if (error) {
    throw new Error(error.message);
  }
  return new Map(data.map((row) => [row.provider_id, toProviderContact(row)]));
}