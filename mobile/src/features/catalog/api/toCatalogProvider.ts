import { type Tables } from "@/lib/database.types";
import { type ProviderContact } from "@/lib/providerContacts";

import { type CatalogProvider } from "../types";

// The columns of the provider profile that customers can see
export type ProfileRow = Pick<
  Tables<"provider_profiles">,
  "provider_id" | "headline" | "description"
>;

export function toCatalogProvider(
  profile: ProfileRow,
  contact: ProviderContact | null,
): CatalogProvider {
  return {
    id: profile.provider_id,
    headline: profile.headline,
    description: profile.description,
    contact,
  };
}
