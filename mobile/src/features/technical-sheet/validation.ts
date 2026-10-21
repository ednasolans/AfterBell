import {
  hasErrors,
  isBlank,
  isValidEmail,
  isValidPhoneNumber,
  isValidWebsite,
} from "@/lib/validation";
import {
  EMPTY_ADDRESS_FORM,
  validateAddress,
  type AddressErrors,
} from "@/lib/addresses";

import type { TechnicalSheetForm } from "./types";

// One message per field, except the addresses: one set of errors per address,
// in the same order as the form
export type SheetErrors = Partial<
  Record<Exclude<keyof TechnicalSheetForm, "addresses">, string>
> & { addresses?: AddressErrors[] };

// Same limits as the CHECK constraints of the technical_sheets table
export const NAME_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 500;
export const EMAIL_MAX_LENGTH = 254;
export const WEBSITE_MAX_LENGTH = 300;

// The text is saved trimmed, so its length is measured without surrounding spaces
function isTooLong(value: string, maxLength: number): boolean {
  return value.trim().length > maxLength;
}

// Section 1a: who the provider is
function validateIdentity(
  sheet: TechnicalSheetForm,
  errors: SheetErrors,
): void {
  if (isBlank(sheet.name)) {
    errors.name = "Name is required";
  } else if (isTooLong(sheet.name, NAME_MAX_LENGTH)) {
    errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters`;
  }
  if (sheet.providerType === null) {
    errors.providerType = "Select a provider type";
  }
  // The description is optional
  if (isTooLong(sheet.description, DESCRIPTION_MAX_LENGTH)) {
    errors.description = `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`;
  }
}

// Section 1b: where the provider offers its activities.
// The form always has at least one address; an empty list is treated as one empty address.
function validateAddresses(
  sheet: TechnicalSheetForm,
  errors: SheetErrors,
): void {
  const addresses =
    sheet.addresses.length > 0 ? sheet.addresses : [EMPTY_ADDRESS_FORM];
  const addressErrors = addresses.map(validateAddress);
  // Only added when an address is wrong, so hasErrors() stays false for a valid sheet
  if (addressErrors.some(hasErrors)) {
    errors.addresses = addressErrors;
  }
}

// Section 1c: how to contact the provider (phone or email required, website optional)
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
function validateActivity(
  sheet: TechnicalSheetForm,
  errors: SheetErrors,
): void {
  if (sheet.activityTypes.length === 0) {
    errors.activityTypes = "At least one activity type is required";
  }
}

export function validateTechnicalSheet(sheet: TechnicalSheetForm): SheetErrors {
  const errors: SheetErrors = {};
  validateIdentity(sheet, errors);
  validateAddresses(sheet, errors);
  validateContact(sheet, errors);
  validateActivity(sheet, errors);
  return errors;
}
