// Messages written for the family in the enrolment functions. Any other error
// (no connection, a Postgres message) would mean nothing to them.
const KNOWN_ERRORS = [
  "This activity is not available for enrolment",
  "This family profile already has a request for this activity",
  "This activity is full",
  "Family profile is not accessible",
  "Only pending or accepted requests can be cancelled",
];

export function toEnrolmentErrorMessage(
  error: Error | null,
  genericMessage: string,
): string | null {
  if (!error) {
    return null;
  }
  return KNOWN_ERRORS.includes(error.message) ? error.message : genericMessage;
}
