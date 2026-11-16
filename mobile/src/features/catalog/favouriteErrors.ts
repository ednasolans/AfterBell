// RLS rejects saving an activity that is not published (any more), or saving
// from an account that is not a customer
const NOT_SAVABLE =
  'new row violates row-level security policy for table "favourites"';

export const FAVOURITE_NOT_SAVABLE_MESSAGE =
  "This activity can no longer be saved.";
export const FAVOURITE_GENERIC_MESSAGE =
  "Your favourites could not be updated. Please try again.";

// Any other error (no connection, a Postgres message) would mean nothing to the family
export function toFavouriteErrorMessage(error: Error): string {
  return error.message === NOT_SAVABLE
    ? FAVOURITE_NOT_SAVABLE_MESSAGE
    : FAVOURITE_GENERIC_MESSAGE;
}
