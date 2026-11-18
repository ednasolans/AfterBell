import { toLocationErrorMessage } from "./locationErrors";

describe("toLocationErrorMessage", () => {
  it("returns nothing when there is no error", () => {
    expect(toLocationErrorMessage(null)).toBeNull();
  });

  it("shows the messages written for the family", () => {
    expect(toLocationErrorMessage(new Error("Enter your city or town"))).toBe(
      "Enter your city or town",
    );
  });

  it("hides any other error", () => {
    expect(toLocationErrorMessage(new Error("Network request failed"))).toBe(
      "Your town could not be saved. Please try again.",
    );
  });
});
