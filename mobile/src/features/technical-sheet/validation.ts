import { isValidEmail } from '../../lib/validation';
import type { TechnicalSheetForm } from './types';

export type SheetErrors = Partial<Record<keyof TechnicalSheetForm, string>>;

function isBlank(value: string): boolean {
  return value.trim() === '';
}

// Section 1: basic information and contact
function validateBasicInfo(sheet: TechnicalSheetForm, errors: SheetErrors): void {
  if (isBlank(sheet.name)) {
    errors.name = 'Name is required';
  }
  if (sheet.providerType === null) {
    errors.providerType = 'Select a provider type';
  }
  if (isBlank(sheet.city)) {
    errors.city = 'City is required';
  }

  // At least one way to contact the provider
  if (isBlank(sheet.phoneNumber) && isBlank(sheet.email)) {
    errors.phoneNumber = 'Enter a phone number or an email';
  }
  // The email is optional, but if there is one it must be valid
  if (!isBlank(sheet.email) && !isValidEmail(sheet.email)) {
    errors.email = 'Enter a valid email';
  }
}

// Section 2: activity
function validateActivity(sheet: TechnicalSheetForm, errors: SheetErrors): void {
  if (sheet.activityTypes.filter((type) => !isBlank(type)).length === 0) {
    errors.activityTypes = 'At least one activity type is required';
  }
  if (sheet.targetAgeRanges.length === 0) {
    errors.targetAgeRanges = 'At least one target age range is required';
  }
  if (sheet.schedule.length === 0) {
    errors.schedule = 'At least one time slot is required';
  }
}

// Section 3: prices
function validatePrices(sheet: TechnicalSheetForm, errors: SheetErrors): void {
  const { priceMin, priceMax } = sheet;

  if (priceMin === null) {
    errors.priceMin = 'Minimum price is required';
  } else if (priceMin < 0) {
    errors.priceMin = 'Price cannot be negative';
  }

  if (priceMax === null) {
    errors.priceMax = 'Maximum price is required';
  } else if (priceMax < 0) {
    errors.priceMax = 'Price cannot be negative';
  } else if (priceMin !== null && priceMax < priceMin) {
    errors.priceMax = 'Maximum price cannot be less than minimum price';
  }
}

export function validateTechnicalSheet(sheet: TechnicalSheetForm): SheetErrors {
  const errors: SheetErrors = {};

  validateBasicInfo(sheet, errors);
  validateActivity(sheet, errors);
  validatePrices(sheet, errors);

  return errors;
}

export function hasErrors(errors: SheetErrors): boolean {
  return Object.keys(errors).length > 0;
}