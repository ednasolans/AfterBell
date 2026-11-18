// Messages written for the family in set_family_location. Any other error
// (no connection, a Postgres message) would mean nothing to them.
const KNOWN_ERRORS = [
  "Enter your city or town",
  "The city name is too long",
  "The location is not valid",
  "Only family accounts can save a location",
];

export const TOWN_NOT_FOUND =
  "We could not find this town. Check the name, or allow access to your location.";
export const NO_CURRENT_LOCATION =
  "We could not get your location. Allow access to it, or type your town.";
const GENERIC_ERROR = "Your town could not be saved. Please try again.";

export function toLocationErrorMessage(error: Error | null): string | null {
  if (!error) {
    return null;
  }
  return KNOWN_ERRORS.includes(error.message) ? error.message : GENERIC_ERROR;
}
