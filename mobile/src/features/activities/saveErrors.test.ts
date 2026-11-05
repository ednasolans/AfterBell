import { toSaveErrorMessage } from "./saveErrors";

describe("toSaveErrorMessage", () => {
  it("returns nothing when there is no error", () => {
    expect(toSaveErrorMessage(null)).toBeNull();
  });

  it("shows the messages written for the provider", () => {
    const message = "The start date cannot be in the past";

    expect(toSaveErrorMessage(new Error(message))).toBe(message);
  });

  it("hides any other message", () => {
    expect(toSaveErrorMessage(new Error("Network request failed"))).toBe(
      "The activity could not be saved. Please try again.",
    );
  });
});
