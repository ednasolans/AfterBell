import {
  isBlank,
  isValidEmail,
  isValidPhoneNumber,
  isValidWebsite,
} from "@/lib/validation";

import type { TechnicalSheetForm } from "./types";

export type SheetErrors = Partial<Record<keyof TechnicalSheetForm, string>>;

// Same limits as the CHECK constraints of the technical_sheets table
export const NAME_MAX_LENGTH = 120;
export const CITY_MAX_LENGTH = 100;
export const ADDRESS_MAX_LENGTH = 200;
export const EMAIL_MAX_LENGTH = 254;
export const WEBSITE_MAX_LENGTH = 300;

// The text is saved trimmed, so its length is measured without surrounding spaces
function isTooLong(value: string, maxLength: number): boolean {
  return value.trim().length > maxLength;
}

// Section 1a: who the provider is and where
function validateIdentity(sheet: TechnicalSheetForm, errors: SheetErrors): void {
  if (isBlank(sheet.name)) {
    errors.name = "Name is required";
  } else if (isTooLong(sheet.name, NAME_MAX_LENGTH)) {
    errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters`;
  }
  if (sheet.providerType === null) {
    errors.providerType = "Select a provider type";
  }
  if (isBlank(sheet.city)) {
    errors.city = "City is required";
  } else if (isTooLong(sheet.city, CITY_MAX_LENGTH)) {
    errors.city = `City must be at most ${CITY_MAX_LENGTH} characters`;
  }
  // The address is optional
  if (isTooLong(sheet.address, ADDRESS_MAX_LENGTH)) {
    errors.address = `Address must be at most ${ADDRESS_MAX_LENGTH} characters`;
  }
}

// Section 1b: how to contact the provider (phone or email required, website optional)
function validateContact(sheet: TechnicalSheetForm, errors: SheetErrors): void {
  const hasPhone = !isBlank(sheet.phoneNumber);
  const hasEmail = !isBlank(sheet.email);

  if (!hasPhone && !hasEmail) {
    errors.phoneNumber = "Enter a phone number or an email";
  } else if (hasPhone && !isValidPhoneNumber(sheet.phoneNumber.trim())) {
    errors.phoneNumber = "Enter a valid phone number";
  }

  if (hasEmail && isTooLong(sheet.email, EMAIL_MAX_LENGTH)) {
    errors.email = `Email must be at most ${EMAIL_MAX_LENGTH} characters`;
  } else if (hasEmail && !isValidEmail(sheet.email.trim())) {
    errors.email = "Enter a valid email";
  }

  if (isTooLong(sheet.website, WEBSITE_MAX_LENGTH)) {
    errors.website = `Website must be at most ${WEBSITE_MAX_LENGTH} characters`;
  } else if (!isBlank(sheet.website) && !isValidWebsite(sheet.website.trim())) {
    errors.website = "The website must start with http:// or https://";
  }
}

// Section 2: activity
function validateActivity(sheet: TechnicalSheetForm, errors: SheetErrors): void {
  if (sheet.activityTypes.length === 0) {
    errors.activityTypes = "At least one activity type is required";
  }
}

export function validateTechnicalSheet(sheet: TechnicalSheetForm): SheetErrors {
  const errors: SheetErrors = {};
  validateIdentity(sheet, errors);
  validateContact(sheet, errors);
  validateActivity(sheet, errors);
  return errors;
}