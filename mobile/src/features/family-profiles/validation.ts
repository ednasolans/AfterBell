
import { AGE_RANGES } from "@/lib/ages";
import { ACTIVITY_CATEGORIES } from "@/lib/activityCategories";
import type { FamilyProfileFormValues } from "./types";

export type FamilyProfileErrors = {
  firstName?: string;
  ageRange?: string;
  interests?: string;
};

export function validateFamilyProfile(
  values: FamilyProfileFormValues,
): FamilyProfileErrors {
  const errors: FamilyProfileErrors = {};
  const firstName = values.firstName.trim();

  if (!firstName) {
    errors.firstName = "First name is required";
  } else if (firstName.length > 50) {
    errors.firstName = "First name must be 50 characters or less";
  }

  if (
    values.ageRange === null ||
    !AGE_RANGES.includes(values.ageRange)
  ) {
    errors.ageRange = "Select a valid age range";
  }

  if (
    values.interests.some(
      (interest) =>
        !ACTIVITY_CATEGORIES.includes(interest),
    
    )
  ) {
    errors.interests = "Select valid interests";
  }

  return errors;
}

export function hasFamilyProfileErrors(
  errors: FamilyProfileErrors,
): boolean {
  return Object.values(errors).some(Boolean);
}
