import {
  CITY_MAX_LENGTH,
  EARLIEST_DATE_OF_BIRTH,
  validateFamilyCity,
  validateFamilyProfile,
} from "./validation";

import type { FamilyProfileFormValues } from "./types";

const validForm: FamilyProfileFormValues = {
  firstName: "Anna",
  dateOfBirth: "2018-03-01",
  interests: ["music", "swimming"],
};

describe("validateFamilyProfile", () => {
  it("accepts valid data", () => {
    expect(validateFamilyProfile(validForm)).toEqual({});
  });

  it("rejects an empty first name", () => {
    const errors = validateFamilyProfile({
      ...validForm,
      firstName: "   ",
    });

    expect(errors.firstName).toBeDefined();
  });

  it("rejects names longer than 50 characters", () => {
    const errors = validateFamilyProfile({
      ...validForm,
      firstName: "A".repeat(51),
    });

    expect(errors.firstName).toBeDefined();
  });

  it("requires a date of birth", () => {
    const errors = validateFamilyProfile({
      ...validForm,
      dateOfBirth: null,
    });

    expect(errors.dateOfBirth).toBe("Enter the date of birth");
  });

  describe("date of birth", () => {
    const TODAY = new Date(2026, 10, 21);

    it.each([
      ["today", "2026-11-21"],
      ["the earliest allowed day", EARLIEST_DATE_OF_BIRTH],
    ])("accepts %s", (_case, dateOfBirth) => {
      expect(
        validateFamilyProfile({ ...validForm, dateOfBirth }, TODAY).dateOfBirth,
      ).toBeUndefined();
    });

    it("rejects tomorrow", () => {
      expect(
        validateFamilyProfile(
          { ...validForm, dateOfBirth: "2026-11-22" },
          TODAY,
        ).dateOfBirth,
      ).toBe("The date of birth cannot be in the future");
    });

    it("rejects the day before the earliest allowed one", () => {
      expect(
        validateFamilyProfile(
          { ...validForm, dateOfBirth: "1899-12-31" },
          TODAY,
        ).dateOfBirth,
      ).toBe("Enter a date of birth from 1900 onwards");
    });

    it("does not change the form", () => {
      const form = { ...validForm };
      validateFamilyProfile(form, TODAY);
      expect(form).toEqual(validForm);
    });
  });

  it("allows an empty interests list", () => {
    const errors = validateFamilyProfile({
      ...validForm,
      interests: [],
    });

    expect(errors.interests).toBeUndefined();
  });

  it("rejects an unknown interest", () => {
    const errors = validateFamilyProfile({
      ...validForm,
      interests: ["invalid-category" as never],
    });

    expect(errors.interests).toBeDefined();
  });

  it("accepts a 50-character name", () => {
    const errors = validateFamilyProfile({
      ...validForm,
      firstName: "A".repeat(50),
    });

    expect(errors.firstName).toBeUndefined();
  });
});

describe("validateFamilyCity", () => {
  it("accepts a town", () => {
    expect(validateFamilyCity("Lleida")).toBeNull();
  });

  it("requires a town, ignoring spaces", () => {
    expect(validateFamilyCity("   ")).toBe("Enter your city or town");
  });

  it("accepts exactly the maximum length, measured without spaces", () => {
    expect(validateFamilyCity(` ${"a".repeat(CITY_MAX_LENGTH)} `)).toBeNull();
  });

  it("rejects one character more than the maximum", () => {
    expect(validateFamilyCity("a".repeat(CITY_MAX_LENGTH + 1))).toBe(
      "The city name must be 100 characters or less",
    );
  });
});
