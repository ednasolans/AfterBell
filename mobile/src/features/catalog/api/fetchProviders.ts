import { supabase } from "@/lib/supabase";

import { type CatalogProvider } from "../types";
import { PROVIDER_COLUMNS, toCatalogProvider } from "./toCatalogProvider";

// Name and contact details of the given providers, by provider id
export async function fetchProviders(
  providerIds: string[],
): Promise<Map<string, CatalogProvider>> {
  if (providerIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("technical_sheets")
    .select(PROVIDER_COLUMNS)
    .in("provider_id", providerIds);
  if (error) {
    throw new Error(error.message);
  }
  return new Map(data.map((row) => [row.provider_id, toCatalogProvider(row)]));
}