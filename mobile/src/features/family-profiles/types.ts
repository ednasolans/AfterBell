import type { Database } from "@/lib/database.types";
import { ACTIVITY_CATEGORIES } from "@/lib/activityCategories";

export type FamilyProfile =
  Database["public"]["Tables"]["family_profiles"]["Row"];

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export type FamilyProfileFormValues = {
  firstName: string;
  // ISO date (YYYY-MM-DD), or null until it is chosen
  dateOfBirth: string | null;
  interests: ActivityCategory[];
};

export const EMPTY_FAMILY_PROFILE_FORM: FamilyProfileFormValues = {
  firstName: "",
  dateOfBirth: null,
  interests: [],
};
