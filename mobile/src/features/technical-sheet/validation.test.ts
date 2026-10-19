import { EMPTY_TECHNICAL_SHEET_FORM, type TechnicalSheetForm } from "./types";
import { validateTechnicalSheet } from "./validation";
import { type ActivityCategory } from "@/lib/activityCategories";
import { Facility } from "./types";

const VALID_SHEET: TechnicalSheetForm = {
  name: "Some Name",
  address: "Some Address",
  providerType: "sports_club",
  city: "Some City",
  website: "",
  phoneNumber: "1234567890",
  email: "user@example.com",
  activityTypes: ["football", "music"] as ActivityCategory[],
  facilities: ["wifi", "cafeteria"] as Facility[],
};

describe("validateTechnicalSheet", () => {
  it("returns errors for an empty technical sheet", () => {
    const errors = validateTechnicalSheet(EMPTY_TECHNICAL_SHEET_FORM);
    expect(errors).toEqual({
      name: "Name is required",
      providerType: "Select a provider type",
      city: "City is required",
      phoneNumber: "Enter a phone number or an email",
      activityTypes: "At least one activity type is required",
    });
  });

  it("returns no errors for a valid technical sheet", () => {
    const errors = validateTechnicalSheet(VALID_SHEET);
    expect(errors).toEqual({});
  });

  describe("basic information", () => {
    it("requires a name", () => {
      const sheetWithoutName = { ...VALID_SHEET, name: "" };
      const errors = validateTechnicalSheet(sheetWithoutName);
      expect(errors.name).toBe("Name is required");
    });
    it("treats a name with only whitespace as invalid", () => {
      const sheetWithWhitespaceName = { ...VALID_SHEET, name: "   " };
      const errors = validateTechnicalSheet(sheetWithWhitespaceName);
      expect(errors.name).toBe("Name is required");
    });
    it("requires a provider type", () => {
      const sheetWithoutProviderType = { ...VALID_SHEET, providerType: null };
      const errors = validateTechnicalSheet(sheetWithoutProviderType);
      expect(errors.providerType).toBe("Select a provider type");
    });
    it("requires a city", () => {
      const sheetWithoutCity = { ...VALID_SHEET, city: "" };
      const errors = validateTechnicalSheet(sheetWithoutCity);
      expect(errors.city).toBe("City is required");
    });
  });
  describe("contact information", () => {
    it("requires a phone number or an email", () => {
      const sheetWithoutContact = {
        ...VALID_SHEET,
        phoneNumber: "",
        email: "",
      };
      const errors = validateTechnicalSheet(sheetWithoutContact);
      expect(errors.phoneNumber).toBe("Enter a phone number or an email");
    });
    it("rejects an invalid email", () => {
      const sheetWithInvalidEmail = { ...VALID_SHEET, email: "invalid-email" };
      const errors = validateTechnicalSheet(sheetWithInvalidEmail);
      expect(errors.email).toBe("Enter a valid email");
    });
    it("accepts only a phone number", () => {
      const sheetWithValidPhone = {
        ...VALID_SHEET,
        email: "",
        phoneNumber: "1234567890",
      };
      const errors = validateTechnicalSheet(sheetWithValidPhone);
      expect(errors.phoneNumber).toBeUndefined();
    });
  });
  describe("activity", () => {
    it("requires at least one activity type", () => {
      const sheetWithoutActivityTypes = { ...VALID_SHEET, activityTypes: [] };
      const errors = validateTechnicalSheet(sheetWithoutActivityTypes);
      expect(errors.activityTypes).toBe(
        "At least one activity type is required",
      );
    });
    it("treats activity types with only whitespace as empty", () => {
      const errors = validateTechnicalSheet({
        ...VALID_SHEET,
        activityTypes: [],
      });
      expect(errors.activityTypes).toBeDefined();
    });
  });
});
