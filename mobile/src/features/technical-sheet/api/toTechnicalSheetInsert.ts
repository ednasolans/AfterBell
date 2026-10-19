import { type TablesInsert } from "../../../lib/database.types";
import { type TechnicalSheetForm } from "../types";

export type TechnicalSheetInsert = TablesInsert<"technical_sheets">;

// Optional text fields are stored as NULL when empty, never as ''
function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// Converts a validated form into a database row (camelCase -> snake_case).
// provider_id is not sent: the database fills it with the logged-in user.
export function toTechnicalSheetInsert(
  sheet: TechnicalSheetForm,
): TechnicalSheetInsert {
  const { providerType } = sheet;
  if (providerType === null) {
    throw new Error("The technical sheet must be validated before saving it");
  }

  return {
    name: sheet.name.trim(),
    provider_type: providerType,
    city: sheet.city.trim(),
    address: emptyToNull(sheet.address),
    phone_number: emptyToNull(sheet.phoneNumber),
    email: emptyToNull(sheet.email),
    website: emptyToNull(sheet.website),
    activity_types: sheet.activityTypes,
    facilities: sheet.facilities,
  };
}
