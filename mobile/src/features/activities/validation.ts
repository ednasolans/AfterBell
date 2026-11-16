import { toIsoDate } from "@/lib/dates";
import { isBlank } from "@/lib/validation";

import { EMPTY_ACTIVITY_FORM, type ActivityForm } from "./types";

export type ActivityErrors = Partial<Record<keyof ActivityForm, string>>;

export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 1000;

function validateDetails(form: ActivityForm, errors: ActivityErrors): void {
  if (isBlank(form.title)) {
    errors.title = "Enter the title of the activity";
  } else if (form.title.trim().length > TITLE_MAX_LENGTH) {
    errors.title = `The title can have up to ${TITLE_MAX_LENGTH} characters`;
  }
  if (form.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `The description can have up to ${DESCRIPTION_MAX_LENGTH} characters`;
  }
  if (form.category === null) {
    errors.category = "Choose a category";
  }
}

function validateLanguages(
  form: ActivityForm,
  isPublished: boolean,
  errors: ActivityErrors,
): void {
  if (form.category !== "language") return;

  if (isPublished && form.languages.length === 0) {
    errors.languages = "Add at least one language and level.";
    return;
  }

  const pairs = new Set<string>();
  for (const pair of form.languages) {
    const language = pair.language.trim();
    const level = pair.level.trim();
    if (!language || !level) {
      errors.languages = "Enter a language and level for each entry.";
      return;
    }
    const key = JSON.stringify([language, level]);
    if (pairs.has(key)) {
      errors.languages = "Enter each language and level combination once.";
      return;
    }
    pairs.add(key);
  }
}

function validateAudience(form: ActivityForm, errors: ActivityErrors): void {
  if (form.targetAgeRanges.length === 0) {
    errors.targetAgeRanges = "Choose at least one age range";
  }
}

function validatePlace(form: ActivityForm, errors: ActivityErrors): void {
  if (form.addressId === null) {
    errors.addressId = "Choose where the activity takes place";
  }
}

function validateSchedule(form: ActivityForm, errors: ActivityErrors): void {
  if (form.schedule.length === 0) {
    errors.schedule = "Add at least one time slot";
  }
}

// Same rules as the validate_activity_dates trigger. A past start date is only
// wrong when it is being set: an activity that has already started can still
// be edited. ISO dates can be compared as text.
function validateDates(
  form: ActivityForm,
  original: ActivityForm,
  today: string,
  errors: ActivityErrors,
): void {
  if (form.type !== "temporary") {
    return;
  }
  const { startDate, endDate } = form;
  if (startDate === null) {
    errors.startDate = "Choose the start date";
  }
  if (endDate === null) {
    errors.endDate = "Choose the end date";
  }
  if (startDate !== null && endDate !== null && endDate < startDate) {
    errors.endDate = "The end date cannot be before the start date";
  }
  const isSettingStart =
    startDate !== original.startDate || form.type !== original.type;
  if (startDate !== null && startDate < today && isSettingStart) {
    errors.startDate = "The start date cannot be in the past";
  }
}

function validatePrice(form: ActivityForm, errors: ActivityErrors): void {
  if (form.price === null) {
    errors.price = "Enter the price";
  } else if (form.price < 0) {
    errors.price = "The price must be 0 or more";
  }
  if (form.pricePeriod === null) {
    errors.pricePeriod = "Choose a price period";
  }
}

function validateParticipants(
  form: ActivityForm,
  errors: ActivityErrors,
): void {
  if (form.unlimitedParticipants) {
    return;
  }
  if (
    form.maxParticipants === null ||
    !Number.isInteger(form.maxParticipants) ||
    form.maxParticipants < 1 ||
    form.maxParticipants > 1000
  ) {
    errors.maxParticipants = "Enter between 1 and 1000 participants";
  }
}

// `original` holds the saved values when editing, and is empty when creating
export function validateActivity(
  form: ActivityForm,
  original: ActivityForm = EMPTY_ACTIVITY_FORM,
  today: string = toIsoDate(new Date()),
  isPublished = false,
): ActivityErrors {
  const errors: ActivityErrors = {};
  validateDetails(form, errors);
  validateLanguages(form, isPublished, errors);
  validateAudience(form, errors);
  validatePlace(form, errors);
  validateSchedule(form, errors);
  validateDates(form, original, today, errors);
  validatePrice(form, errors);
  validateParticipants(form, errors);
  return errors;
}
