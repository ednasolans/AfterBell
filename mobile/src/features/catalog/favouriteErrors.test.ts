import {
  FAVOURITE_GENERIC_MESSAGE,
  FAVOURITE_NOT_SAVABLE_MESSAGE,
  toFavouriteErrorMessage,
} from "./favouriteErrors";

describe("toFavouriteErrorMessage", () => {
  it("explains that an activity that is no longer published cannot be saved", () => {
    expect(
      toFavouriteErrorMessage(
        new Error(
          'new row violates row-level security policy for table "favourites"',
        ),
      ),
    ).toBe(FAVOURITE_NOT_SAVABLE_MESSAGE);
  });

  it("hides any other error behind a generic message", () => {
    expect(toFavouriteErrorMessage(new Error("Network request failed"))).toBe(
      FAVOURITE_GENERIC_MESSAGE,
    );
  });
});
