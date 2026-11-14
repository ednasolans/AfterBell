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

  it("shows how many participants are already accepted", () => {
    const message = "There are already 8 accepted participants";

    expect(toSaveErrorMessage(new Error(message))).toBe(message);
  });

  it("uses the generic message it is given", () => {
    expect(
      toSaveErrorMessage(new Error("boom"), "The status could not be changed."),
    ).toBe("The status could not be changed.");
  });
});
