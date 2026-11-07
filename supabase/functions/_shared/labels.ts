// Human-readable labels (English) for the codes stored in technical_sheets.
// Values must match the CHECK lists in the technical_sheets migration.

import type { SheetForPrompt, TemporaryActivityForPrompt } from "./types.ts";

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
const TITLE_MAX_CHARS = 120; // same limit as the database
/** The description has about 80 words: there is no room for more activities. */
export const TEMPORARY_ACTIVITIES_MAX = 5;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Sheet data ready to be sent to the LLM. */
export interface PromptData {
  name: string;
  type: string;
  activities: string[];
  facilities: string[];
  description: string | null;
  city: string;
  temporary_activities?: { title: string; start_date: string; end_date: string }[];
}

/** Trims the provider's free text; empty text becomes null. */
function cleanDescription(text: string | null): string | null {
  const trimmed = text?.trim() ?? "";
  return trimmed === "" ? null : trimmed.slice(0, DESCRIPTION_MAX_CHARS);
}

/** Keeps the complete activities: incomplete data must not reach the LLM. */
function cleanTemporaryActivities(activities: TemporaryActivityForPrompt[]) {
  return activities.flatMap(({ title, start_date, end_date }) => {
    const cleanTitle = title.trim().slice(0, TITLE_MAX_CHARS);
    const isComplete = cleanTitle !== "" && ISO_DATE.test(start_date ?? "") &&
      ISO_DATE.test(end_date ?? "");
    return isComplete
      ? [{ title: cleanTitle, start_date: start_date!, end_date: end_date! }]
      : [];
  }).slice(0, TEMPORARY_ACTIVITIES_MAX);
}

export function toPromptData(sheet: SheetForPrompt): PromptData {
  const temporaryActivities = cleanTemporaryActivities(sheet.temporary_activities ?? []);
  return {
    name: sheet.name.trim(),
    type: PROVIDER_TYPE_LABELS[sheet.provider_type] ?? "activity provider",
    activities: translate(sheet.activity_types, ACTIVITY_TYPE_LABELS),
    facilities: translate(sheet.facilities, FACILITY_LABELS),
    description: cleanDescription(sheet.description),
    city: sheet.city.trim(),
    // Left out when empty, so the LLM has no dates to talk about
    ...(temporaryActivities.length > 0 ? { temporary_activities: temporaryActivities } : {}),
  };
}
