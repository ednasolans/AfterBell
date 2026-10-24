import { isBlank } from "@/lib/validation";

import { type ProfileForm } from "./types";

// Same limits as the CHECK constraints of provider_profiles
export const HEADLINE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 2000;

export type ProfileFormErrors = Partial<Record<keyof ProfileForm, string>>;

// One message for a required text with a maximum length, or undefined if it is valid
function validateText(
  value: string,
  label: string,
  maxLength: number,
): string | undefined {
  if (isBlank(value)) {
    return `${label} is required.`;
  }
  if (value.trim().length > maxLength) {
    return `${label} must have at most ${maxLength} characters.`;
  }
  return undefined;
}

export function validateProfileForm(form: ProfileForm): ProfileFormErrors {
  const errors: ProfileFormErrors = {};
  const headline = validateText(form.headline, "Headline", HEADLINE_MAX_LENGTH);
  const description = validateText(
    form.description,
    "Description",
    DESCRIPTION_MAX_LENGTH,
  );
  if (headline) errors.headline = headline;
  if (description) errors.description = description;
  return errors;
}
