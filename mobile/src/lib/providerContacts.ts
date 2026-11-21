import { type Tables } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

// Name and contact details of a provider, taken from its technical sheet
export interface ProviderContact {
  name: string;
  email: string | null;
  phoneNumber: string | null;
  website: string | null;
}

// The columns of the technical sheet that customers can see
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
