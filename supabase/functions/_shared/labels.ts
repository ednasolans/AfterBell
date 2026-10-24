// Human-readable labels (Catalan) for the codes stored in technical_sheets.
// Values must match the CHECK lists in the technical_sheets migration.

import type { SheetForPrompt } from "./types.ts";

export const PROVIDER_TYPE_LABELS: Record<string, string> = {
  sports_club: "club esportiu",
  music_school: "escola de música",
  language_school: "escola d'idiomes",
  art_school: "escola d'art",
  tutoring_academy: "acadèmia de reforç escolar",
  private_tutor: "professor particular",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  football: "futbol",
  basketball: "bàsquet",
  tennis: "tennis",
  swimming: "natació",
  dance: "dansa",
  drama: "teatre",
  music: "música",
  language: "idiomes",
  art: "art",
  tutoring: "reforç escolar",
  other: "altres activitats",
};

export const FACILITY_LABELS: Record<string, string> = {
  parking: "aparcament",
  changing_rooms: "vestidors",
  showers: "dutxes",
  lockers: "taquilles",
  waiting_area: "sala d'espera",
  cafeteria: "cafeteria",
  wifi: "wifi",
  air_conditioning: "aire condicionat",
  outdoor_space: "espai exterior",
  wheelchair_access: "accés per a cadira de rodes",
};

/** Translates codes to labels and drops any unknown code. */
function translate(codes: string[], labels: Record<string, string>): string[] {
  return codes
    .map((code) => labels[code])
    .filter((label): label is string => label !== undefined);
}

/** Sheet data ready to be sent to the LLM. */
export interface PromptData {
  name: string;
  type: string;
  activities: string[];
  facilities: string[];
  city: string;
}

export function toPromptData(sheet: SheetForPrompt): PromptData {
  return {
    name: sheet.name.trim(),
    type: PROVIDER_TYPE_LABELS[sheet.provider_type] ?? "centre d'activitats",
    activities: translate(sheet.activity_types, ACTIVITY_TYPE_LABELS),
    facilities: translate(sheet.facilities, FACILITY_LABELS),
    city: sheet.city.trim(),
  };
}