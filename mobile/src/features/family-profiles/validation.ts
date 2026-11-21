import { ACTIVITY_CATEGORIES } from "@/lib/activityCategories";
import { toIsoDate } from "@/lib/dates";
import type { FamilyProfileFormValues } from "./types";

export type FamilyProfileErrors = {
  firstName?: string;
  dateOfBirth?: string;
  interests?: string;
};

// Same limit as the database (family_dob_reasonable)
export const EARLIEST_DATE_OF_BIRTH = "1900-01-01";

// The database also rejects a date in the future (family_date_of_birth_valid).
// ISO dates compare as text.
function validateDateOfBirth(
  dateOfBirth: string | null,
  today: Date,
): string | undefined {
  if (dateOfBirth === null) {
    return "Enter the date of birth";
  }
  if (dateOfBirth > toIsoDate(today)) {
    return "The date of birth cannot be in the future";
  }
  if (dateOfBirth < EARLIEST_DATE_OF_BIRTH) {
    return "Enter a date of birth from 1900 onwards";
  }
  return undefined;
}

export function validateFamilyProfile(
  values: FamilyProfileFormValues,
  today: Date = new Date(),
): FamilyProfileErrors {
  const errors: FamilyProfileErrors = {};
  const firstName = values.firstName.trim();

  if (!firstName) {
    errors.firstName = "First name is required";
  } else if (firstName.length > 50) {
    errors.firstName = "First name must be 50 characters or less";
  }

  const dateOfBirthError = validateDateOfBirth(values.dateOfBirth, today);
  if (dateOfBirthError) {
    errors.dateOfBirth = dateOfBirthError;
  }

  if (
    values.interests.some((interest) => !ACTIVITY_CATEGORIES.includes(interest))
  ) {
    errors.interests = "Select valid interests";
  }

  return errors;
}

export function hasFamilyProfileErrors(errors: FamilyProfileErrors): boolean {
  return Object.values(errors).some(Boolean);
}

// Same limit as family_groups.city
export const CITY_MAX_LENGTH = 100;

// The town of the family, measured without surrounding spaces, as it is saved
export function validateFamilyCity(city: string): string | null {
  const trimmed = city.trim();
  if (!trimmed) {
    return "Enter your city or town";
  }
  if (trimmed.length > CITY_MAX_LENGTH) {
    return `The city name must be ${CITY_MAX_LENGTH} characters or less`;
  }
  return null;
}
