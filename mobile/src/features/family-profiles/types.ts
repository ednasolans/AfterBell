
import type { Database } from "@/lib/database.types";
import type { AgeRange } from "@/lib/ages";
import { ACTIVITY_CATEGORIES } from "@/lib/activityCategories";

export type FamilyProfile =
  Database["public"]["Tables"]["family_profiles"]["Row"];

export type ActivityCategory =
  (typeof ACTIVITY_CATEGORIES)[number];

export type FamilyProfileFormValues = {
  firstName: string;
  ageRange: AgeRange | null;
  interests: ActivityCategory[];
};

export const EMPTY_FAMILY_PROFILE_FORM: FamilyProfileFormValues = {
  firstName: "",
  ageRange: null,
  interests: [],
};
