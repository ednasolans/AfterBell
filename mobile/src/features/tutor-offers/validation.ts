
import {
  type TutorOfferForm,
  type TutorOfferIssue,
} from "./types";

export function validateTutorOffer(
  form: TutorOfferForm,
): TutorOfferIssue[] {
  const issues: TutorOfferIssue[] = [];

  if (!form.title.trim()) {
    issues.push("title");
  }

  if (form.subjectCodes.length === 0) {
    issues.push("subjects");
  }

  if (form.levelCodes.length === 0) {
    issues.push("levels");
  }

  if (
    form.pricePerHour === null ||
    !Number.isFinite(form.pricePerHour) ||
    form.pricePerHour < 0 ||
    form.pricePerHour > 999999.99
  ) {
    issues.push("price");
  }

  return issues;
}

export function validateTutorOfferDraft(
  form: TutorOfferForm,
): string[] {
  const errors: string[] = [];

  if (!form.technicalSheetId.trim()) {
    errors.push("A tutor technical sheet is required.");
  }

  if (form.title.length > 120) {
    errors.push("Title cannot exceed 120 characters.");
  }

  if (form.description.length > 1000) {
    errors.push(
      "Description cannot exceed 1000 characters.",
    );
  }

  if (
    form.pricePerHour !== null &&
    (
      !Number.isFinite(form.pricePerHour) ||
      form.pricePerHour < 0 ||
      form.pricePerHour > 999999.99
    )
  ) {
    errors.push("Invalid hourly price.");
  }

  return errors;
}
