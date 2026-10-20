import { isValidPassword, hasErrors, isBlank, isValidWebsite, isValidPhoneNumber } from "./validation";

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

describe("isValidPhoneNumber", () => {
  it.each(["973000000", "973 000 000", "973-00-00-00", "+34 973 000 000", "0034973000000"])(
    "accepts %j",
    (phone) => {
      expect(isValidPhoneNumber(phone)).toBe(true);
    },
  );

  it.each(["97300000", "9730000000", "abc973000000x", "+33 973 000 000", ""])(
    "rejects %j",
    (phone) => {
      expect(isValidPhoneNumber(phone)).toBe(false);
    },
  );
});

describe("isValidWebsite", () => {
  it.each([
    "https://club.cat",
    "http://club.cat",
    "https://www.club.cat/clases?dia=lunes",
    "https://club.cat/index.html",
  ])("accepts %j", (url) => {
    expect(isValidWebsite(url)).toBe(true);
  });

  it.each(["club.cat", "www.club.cat", "https://club", "https:// club.cat", ""])(
    "rejects %j",
    (url) => {
      expect(isValidWebsite(url)).toBe(false);
    },
  );
});