// Human-readable labels (English) for the codes stored in technical_sheets.
// Values must match the CHECK lists in the technical_sheets migration.

import type { SheetForPrompt } from "./types.ts";

export const PROVIDER_TYPE_LABELS: Record<string, string> = {
  sports_club: "sports club",
  music_school: "music school",
  language_school: "language school",
  art_school: "art school",
  tutoring_academy: "tutoring academy",
  private_tutor: "private tutor",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  football: "football",
  basketball: "basketball",
  tennis: "tennis",
  swimming: "swimming",
  dance: "dance",
  drama: "drama",
  music: "music",
  language: "languages",
  art: "art",
  tutoring: "tutoring",
  other: "other activities",
};

export const FACILITY_LABELS: Record<string, string> = {
  parking: "parking",
  changing_rooms: "changing rooms",
  showers: "showers",
  lockers: "lockers",
  waiting_area: "waiting area",
  cafeteria: "cafeteria",
  wifi: "Wi-Fi",
  air_conditioning: "air conditioning",
  outdoor_space: "outdoor space",
  wheelchair_access: "wheelchair access",
  outdoor_field: "outdoor field",
  indoor_court: "indoor court",
};

/** Translates codes to labels and drops any unknown code. */
function translate(codes: string[], labels: Record<string, string>): string[] {
  return codes
    .map((code) => labels[code])
    .filter((label): label is string => label !== undefined);
}

const DESCRIPTION_MAX_CHARS = 500; // same limit as the database

/** Sheet data ready to be sent to the LLM. */
export interface PromptData {
  name: string;
  type: string;
  activities: string[];
  facilities: string[];
  description: string | null;
  city: string;
}

/** Trims the provider's free text; empty text becomes null. */
function cleanDescription(text: string | null): string | null {
  const trimmed = text?.trim() ?? "";
  return trimmed === "" ? null : trimmed.slice(0, DESCRIPTION_MAX_CHARS);
}

export function toPromptData(sheet: SheetForPrompt): PromptData {
  return {
    name: sheet.name.trim(),
    type: PROVIDER_TYPE_LABELS[sheet.provider_type] ?? "activity provider",
    activities: translate(sheet.activity_types, ACTIVITY_TYPE_LABELS),
    facilities: translate(sheet.facilities, FACILITY_LABELS),
    description: cleanDescription(sheet.description),
    city: sheet.city.trim(),
  };
}
