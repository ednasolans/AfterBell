import { isBlank } from "@/lib/validation";

import { type ActivityForm } from "./types";

// One error message per field; a field without an entry is valid
export type ActivityErrors = Partial<Record<keyof ActivityForm, string>>;

// Same limits as the CHECK constraints of the activities table
export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 1000;

const AGE_ERROR = "The age must be a whole number, 0 or more";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// A "YYYY-MM-DD" date that exists in the calendar ("2026-02-31" does not)
function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function validateDetails(form: ActivityForm, errors: ActivityErrors): void {
  if (isBlank(form.title)) {
    errors.title = "Enter the title of the activity";
  } else if (form.title.trim().length > TITLE_MAX_LENGTH) {
    errors.title = `The title can have up to ${TITLE_MAX_LENGTH} characters`;
  }
  if (form.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `The description can have up to ${DESCRIPTION_MAX_LENGTH} characters`;
  }
}

function validateAges(form: ActivityForm, errors: ActivityErrors): void {
  const { minAge, maxAge } = form;

  if (minAge === null) {
    errors.minAge = "Enter the minimum age";
  } else if (!Number.isInteger(minAge) || minAge < 0) {
    errors.minAge = AGE_ERROR;
  }

  if (maxAge === null) {
    errors.maxAge = "Enter the maximum age";
  } else if (!Number.isInteger(maxAge) || maxAge < 0) {
    errors.maxAge = AGE_ERROR;
  } else if (minAge !== null && minAge >= 0 && maxAge < minAge) {
    errors.maxAge =
      "The maximum age must be greater than or equal to the minimum";
  }
}

// Where the activity takes place
function validatePlace(form: ActivityForm, errors: ActivityErrors): void {
  if (form.addressId === null) {
    errors.addressId = "Choose where the activity takes place";
  }
}

// The schedule is typed one time slot per line: empty lines are ignored
function validateSchedule(form: ActivityForm, errors: ActivityErrors): void {
  if (form.schedule.every((slot) => isBlank(slot))) {
    errors.schedule = "Add at least one time slot";
  }
}

function validatePrice(form: ActivityForm, errors: ActivityErrors): void {
  if (form.price === null) {
    errors.price = "Enter the price (0 if it is free)";
  } else if (!Number.isInteger(form.price) || form.price < 0) {
    errors.price = "The price must be a whole number of euros, 0 or more";
  }
}

// Both dates are optional, but if they are given they must be real dates
// and the activity cannot end before it starts
function validateDates(form: ActivityForm, errors: ActivityErrors): void {
  const startDate = form.startDate.trim();
  const endDate = form.endDate.trim();
  const startIsValid = startDate === "" || isValidDate(startDate);
  const endIsValid = endDate === "" || isValidDate(endDate);

  if (!startIsValid) {
    errors.startDate = "Enter the start date as YYYY-MM-DD";
  }
  if (!endIsValid) {
    errors.endDate = "Enter the end date as YYYY-MM-DD";
  } else if (
    startIsValid &&
    startDate !== "" &&
    endDate !== "" &&
    endDate < startDate
  ) {
    errors.endDate = "The end date cannot be before the start date";
  }
}

export function validateActivity(form: ActivityForm): ActivityErrors {
  const errors: ActivityErrors = {};
  validateDetails(form, errors);
  validateAges(form, errors);
  validatePlace(form, errors);
  validateSchedule(form, errors);
  validatePrice(form, errors);
  validateDates(form, errors);
  return errors;
}