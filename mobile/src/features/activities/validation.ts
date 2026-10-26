import { isBlank } from "@/lib/validation";

import { type ActivityForm } from "./types";

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
  if (
    form.maxParticipants === null ||
    !Number.isInteger(form.maxParticipants) ||
    form.maxParticipants < 1 ||
    form.maxParticipants > 1000
  ) {
    errors.maxParticipants = "Enter between 1 and 1000 participants";
  }
}

export function validateActivity(form: ActivityForm): ActivityErrors {
  const errors: ActivityErrors = {};
  validateDetails(form, errors);
  validateAudience(form, errors);
  validatePlace(form, errors);
  validateSchedule(form, errors);
  validatePrice(form, errors);
  validateParticipants(form, errors);
  return errors;
}
