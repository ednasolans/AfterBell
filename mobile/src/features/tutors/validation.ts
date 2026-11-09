
import {
  isValidEmail,
  isValidPassword,
} from "@/lib/validation";
import {
  type TutorProfileForm,
  type TutorRegistration,
} from "./types";

export type TutorErrors = Partial<
  Record<keyof TutorRegistration, string>
>;

const POSTAL_CODE =
  /^(0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/;

const FIELD_RULES = [
  ["firstName", "First name", 50],
  ["lastName", "Last name", 50],
  ["presentation", "Presentation", 500],
  ["street", "Street", 200],
  ["number", "Number", 20],
  ["city", "City", 100],
  ["province", "Province", 100],
] as const;

export function validateTutorProfile(
  values: TutorProfileForm,
): TutorErrors {
  const errors: TutorErrors = {};

  for (const [field, label, max] of FIELD_RULES) {
    const value = values[field].trim();

    if (!value) {
      errors[field] = `${label} is required`;
    } else if (value.length > max) {
      errors[field] =
        `${label} must be at most ${max} characters`;
    }
  }

  for (const field of ["floor", "door"] as const) {
    if (values[field].trim().length > 20) {
      errors[field] = `${field} must be at most 20 characters`;
    }
  }

  if (!values.postalCode.trim()) {
    errors.postalCode = "Postal code is required";
  } else if (!POSTAL_CODE.test(values.postalCode.trim())) {
    errors.postalCode = "Enter a valid Spanish postal code";
  }

  if (values.country.trim() !== "Spain") {
    errors.country = "Country must be Spain";
  }

  return errors;
}

export function validateTutorRegistration(
  values: TutorRegistration,
): TutorErrors {
  const errors = validateTutorProfile(values);

  if (!isValidEmail(values.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (!isValidPassword(values.password)) {
    errors.password = "Password must be at least 8 characters";
  }

  return errors;
}

export class TutorValidationError extends Error {
  constructor(public readonly fields: TutorErrors) {
    super("Please correct the highlighted fields");
    this.name = "TutorValidationError";
  }
}
