import { type ActivityCategory } from "@/lib/activityCategories";

export const PROVIDER_TYPES = [
  "sports_club",
  "music_school",
  "language_school",
  "art_school",
  "tutoring_academy",
  "private_tutor",
] as const;

export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const FACILITIES = [
  "parking",
  "changing_rooms",
  "showers",
  "lockers",
  "waiting_area",
  "cafeteria",
  "wifi",
  "air_conditioning",
  "outdoor_space",
  "wheelchair_access",
] as const;

export type Facility = (typeof FACILITIES)[number];

export const FACILITY_LABELS: Record<Facility, string> = {
  parking: "Parking",
  changing_rooms: "Changing rooms",
  showers: "Showers",
  lockers: "Lockers",
  waiting_area: "Waiting area for families",
  cafeteria: "Cafeteria",
  wifi: "Wi-Fi",
  air_conditioning: "Air conditioning",
  outdoor_space: "Outdoor space",
  wheelchair_access: "Wheelchair access",
};

export interface TechnicalSheetForm {
  name: string;
  providerType: ProviderType | null;
  city: string;
  address: string;
  phoneNumber: string;
  email: string;
  website: string;
  activityTypes: ActivityCategory[];
  facilities: Facility[];
}

export const EMPTY_TECHNICAL_SHEET_FORM: TechnicalSheetForm = {
  name: "",
  providerType: null,
  city: "",
  address: "",
  phoneNumber: "",
  email: "",
  website: "",
  activityTypes: [],
  facilities: [],
};

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  sports_club: "Sports club",
  music_school: "Music school",
  language_school: "Language school",
  art_school: "Art school",
  tutoring_academy: "Tutoring academy",
  private_tutor: "Private tutor",
};
