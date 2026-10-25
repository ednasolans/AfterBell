import { type Tables } from "@/lib/database.types";

import { type CatalogProvider, type ProviderContact } from "../types";

// The columns of the technical sheet that customers can see
export const CONTACT_COLUMNS = "provider_id, name, email, phone_number, website";

export type ContactRow = Pick<
  Tables<"technical_sheets">,
  "provider_id" | "name" | "email" | "phone_number" | "website"
>;

export function toProviderContact(row: ContactRow): ProviderContact {
  return {
    name: row.name,
    email: row.email,
    phoneNumber: row.phone_number,
    website: row.website,
  };
}

// The columns of the provider profile that customers can see
export const PROFILE_COLUMNS = "provider_id, headline, description";

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