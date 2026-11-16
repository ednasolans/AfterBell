import { type EnrolmentRequestForm } from "./types";

export type EnrolmentRequestErrors = Partial<
  Record<keyof EnrolmentRequestForm, string>
>;

// Same limit as the CHECK of enrolment_requests.message
export const MESSAGE_MAX_LENGTH = 1000;

export function validateEnrolmentRequest(
  form: EnrolmentRequestForm,
): EnrolmentRequestErrors {
  const errors: EnrolmentRequestErrors = {};
  if (form.profileIds.length === 0) {
    errors.profileIds = "Choose who would attend";
  }
  if (form.message.trim().length > MESSAGE_MAX_LENGTH) {
    errors.message = `The message can have up to ${MESSAGE_MAX_LENGTH} characters`;
  }
  return errors;
}
