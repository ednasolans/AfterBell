import { toEnrolmentErrorMessage } from "./enrolmentErrors";

describe("toEnrolmentErrorMessage", () => {
  it("returns nothing without an error", () => {
    expect(toEnrolmentErrorMessage(null, "Generic")).toBeNull();
  });

  it("shows the messages written for the family", () => {
    expect(
      toEnrolmentErrorMessage(new Error("This activity is full"), "Generic"),
    ).toBe("This activity is full");
  });

  it("hides any other message", () => {
    expect(
      toEnrolmentErrorMessage(new Error("Network request failed"), "Generic"),
    ).toBe("Generic");
  });
});
