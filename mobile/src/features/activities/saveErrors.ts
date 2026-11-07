// Messages written by us in the database and the API. Any other error (no
// connection, a Postgres message) would mean nothing to a provider.
const KNOWN_SAVE_ERRORS = [
  "Whole-year activities cannot have dates",
  "Temporary activities require a start date and an end date",
  "The end date cannot be before the start date",
  "The start date cannot be in the past",
  "A complete technical sheet is required to publish",
  "A complete structured address is required to publish",
  "Temporary activities require valid start and end dates",
  "Language or tutor activities require language and level",
  "The activity does not exist or you cannot edit it",
];

const GENERIC_SAVE_ERROR = "The activity could not be saved. Please try again.";

export function toSaveErrorMessage(error: Error | null): string | null {
  if (!error) {
    return null;
  }
  return KNOWN_SAVE_ERRORS.includes(error.message)
    ? error.message
    : GENERIC_SAVE_ERROR;
}
