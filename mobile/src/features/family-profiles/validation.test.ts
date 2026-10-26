
import { validateFamilyProfile } from "./validation";

import type { FamilyProfileFormValues } from "./types";

const validForm: FamilyProfileFormValues = {
  firstName: "Anna",
  ageRange: "7-9",
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

  it("requires an age range", () => {
    const errors = validateFamilyProfile({
      ...validForm,
      ageRange: null,
    });

    expect(errors.ageRange).toBeDefined();
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