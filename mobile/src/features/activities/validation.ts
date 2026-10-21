import { isValidTimeSlot } from "@/lib/schedule";
import { isBlank } from "@/lib/validation";

import { type ActivityForm } from "./types";

// One error message per field; a field without an entry is valid
export type ActivityErrors = Partial<Record<keyof ActivityForm, string>>;

// Same limits as the CHECK constraints of the activities table
export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 1000;
export const MIN_PARTICIPANTS = 1;
export const MAX_PARTICIPANTS = 1000;

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
  if (form.targetAgeRanges.length === 0) {
    errors.targetAgeRanges = "Choose at least one age range";
  }
  if (form.maxParticipants === null) {
    errors.maxParticipants = "Enter the maximum number of people";
  } else if (
    form.maxParticipants < MIN_PARTICIPANTS ||
    form.maxParticipants > MAX_PARTICIPANTS
  ) {
    errors.maxParticipants = `The maximum must be between ${MIN_PARTICIPANTS} and ${MAX_PARTICIPANTS} people`;
  }
}

// Where the activity takes place
function validatePlace(form: ActivityForm, errors: ActivityErrors): void {
  if (form.addressId === null) {
    errors.addressId = "Choose where the activity takes place";
  }
}

function validateSchedule(form: ActivityForm, errors: ActivityErrors): void {
  if (form.schedule.length === 0) {
    errors.schedule = "Add at least one time slot";
  } else if (!form.schedule.every(isValidTimeSlot)) {
    errors.schedule =
      "Each time slot needs a valid start time before its end time (HH:MM)";
  }
}

function validatePrices(form: ActivityForm, errors: ActivityErrors): void {
  const { priceMin, priceMax } = form;

  if (priceMin === null) {
    errors.priceMin = "Enter the minimum price";
  } else if (priceMin < 0) {
    errors.priceMin = "The price cannot be negative";
  }

  if (priceMax === null) {
    errors.priceMax = "Enter the maximum price";
  } else if (priceMax < 0) {
    errors.priceMax = "The price cannot be negative";
  } else if (priceMin !== null && priceMin >= 0 && priceMax < priceMin) {
    errors.priceMax =
      "The maximum price must be greater than or equal to the minimum";
  }

  if (form.pricePeriod === null) {
    errors.pricePeriod = "Choose how the price is charged";
  }
}

export function validateActivity(form: ActivityForm): ActivityErrors {
  const errors: ActivityErrors = {};
  validateDetails(form, errors);
  validatePlace(form, errors);
  validateSchedule(form, errors);
  validatePrices(form, errors);
  return errors;
}
