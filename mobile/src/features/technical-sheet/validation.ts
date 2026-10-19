import { isValidEmail, isBlank } from "../../lib/validation";
import type { TechnicalSheetForm } from "./types";

export type SheetErrors = Partial<Record<keyof TechnicalSheetForm, string>>;

// Section 1: basic information and contact
function validateBasicInfo(
  sheet: TechnicalSheetForm,
  errors: SheetErrors,
): void {
  if (isBlank(sheet.name)) {
    errors.name = "Name is required";
  }
  if (sheet.providerType === null) {
    errors.providerType = "Select a provider type";
  }
  if (isBlank(sheet.city)) {
    errors.city = "City is required";
  }

  // At least one way to contact the provider
  if (isBlank(sheet.phoneNumber) && isBlank(sheet.email)) {
    errors.phoneNumber = "Enter a phone number or an email";
  }
  // The email is optional, but if there is one it must be valid
  if (!isBlank(sheet.email) && !isValidEmail(sheet.email)) {
    errors.email = "Enter a valid email";
  }
}

// Section 2: activity
function validateActivity(
  sheet: TechnicalSheetForm,
  errors: SheetErrors,
): void {
  if (sheet.activityTypes.filter((type) => !isBlank(type)).length === 0) {
    errors.activityTypes = "At least one activity type is required";
  }
}

export function validateTechnicalSheet(sheet: TechnicalSheetForm): SheetErrors {
  const errors: SheetErrors = {};

  validateBasicInfo(sheet, errors);
  validateActivity(sheet, errors);

  return errors;
}
