import { isValidPassword, hasErrors, isBlank } from "./validation";

describe("isValidPassword", () => {
  it("accepts passwords with at least 8 characters", () => {
    expect(isValidPassword("12345678")).toBe(true);
  });

  it("rejects shorter passwords", () => {
    expect(isValidPassword("1234567")).toBe(false);
  });
});

describe("isBlank", () => {
  it.each(["", " ", "   \n"])("is true for %j", (value) => {
    expect(isBlank(value)).toBe(true);
  });

  it("is false for text with content", () => {
    expect(isBlank(" Lleida ")).toBe(false);
  });
});

describe("hasErrors", () => {
  it("is false without errors and true with any error", () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ name: "Enter the name" })).toBe(true);
  });
});