import { type TablesInsert } from "../../../lib/database.types";
import { emptyToNull } from "@/lib/text";

import { type TechnicalSheetForm } from "../types";

export type TechnicalSheetInsert = TablesInsert<"technical_sheets">;

// Converts a validated form into a database row (camelCase -> snake_case).
// provider_id is not sent: the database fills it with the logged-in user.
// The addresses are saved in their own table first; the sheet only keeps the
// id of the main one.
export function toTechnicalSheetInsert(
  sheet: TechnicalSheetForm,
  mainAddressId: string,
): TechnicalSheetInsert {
  const { providerType } = sheet;
  if (providerType === null) {
    throw new Error("The technical sheet must be validated before saving it");
  }

  return {
    name: sheet.name.trim(),
    provider_type: providerType,
    description: emptyToNull(sheet.description),
    address_id: mainAddressId,
    phone_number: emptyToNull(sheet.phoneNumber),
    email: emptyToNull(sheet.email),
    website: emptyToNull(sheet.website),
    activity_types: sheet.activityTypes,
    facilities: sheet.facilities,
  };
}
