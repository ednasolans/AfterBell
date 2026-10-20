import { EMPTY_TECHNICAL_SHEET_FORM, type TechnicalSheetForm } from "./types";
import {
  NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  validateTechnicalSheet,
  EMAIL_MAX_LENGTH,
} from "./validation";
import { type ActivityCategory } from "@/lib/activityCategories";
import { Facility } from "./types";

const VALID_SHEET: TechnicalSheetForm = {
  name: "Some Name",
  providerType: "sports_club",
  description: "",
  addresses: [{ address: "C/ Major 1", city: "Lleida" }],
  website: "",
  phoneNumber: "973 000 000",
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
      addresses: [{ address: "Address is required", city: "City is required" }],
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
  });
  describe("addresses", () => {
    it("returns the errors of each address in the same order", () => {
      const errors = validateTechnicalSheet({
        ...VALID_SHEET,
        addresses: [
          { address: "C/ Major 1", city: "Lleida" },
          { address: "Av. Catalunya 5", city: "" },
        ],
      });
      expect(errors.addresses).toEqual([{}, { city: "City is required" }]);
    });
    it("accepts several valid addresses", () => {
      const errors = validateTechnicalSheet({
        ...VALID_SHEET,
        addresses: [
          { address: "C/ Major 1", city: "Lleida" },
          { address: "Av. Catalunya 5", city: "Balaguer" },
        ],
      });
      expect(errors.addresses).toBeUndefined();
    });
    it("requires at least one address", () => {
      const errors = validateTechnicalSheet({ ...VALID_SHEET, addresses: [] });
      expect(errors.addresses).toEqual([
        { address: "Address is required", city: "City is required" },
      ]);
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
        phoneNumber: "973 000 000",
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
  describe("length limits", () => {
    it.each([
      ["name", NAME_MAX_LENGTH],
      ["description", DESCRIPTION_MAX_LENGTH],
    ] as const)(
      "accepts %s at its limit and rejects one more character",
      (field, max) => {
        const atLimit = "a".repeat(max);
        expect(
          validateTechnicalSheet({ ...VALID_SHEET, [field]: atLimit })[field],
        ).toBeUndefined();
        expect(
          validateTechnicalSheet({ ...VALID_SHEET, [field]: `${atLimit}a` })[
            field
          ],
        ).toBeDefined();
      },
    );
  });

  describe("contact", () => {
    it("rejects an invalid phone number", () => {
      expect(
        validateTechnicalSheet({ ...VALID_SHEET, phoneNumber: "12345" })
          .phoneNumber,
      ).toBeDefined();
    });

    it("rejects a website without http:// or https://", () => {
      expect(
        validateTechnicalSheet({ ...VALID_SHEET, website: "club.cat" }).website,
      ).toBeDefined();
    });

    it("accepts a website with https://", () => {
      expect(
        validateTechnicalSheet({ ...VALID_SHEET, website: "https://club.cat" })
          .website,
      ).toBeUndefined();
    });

    it("shows only the length error for an email that is too long", () => {
      const email = `${"a".repeat(EMAIL_MAX_LENGTH)}@club.cat`;
      expect(validateTechnicalSheet({ ...VALID_SHEET, email }).email).toContain(
        "at most",
      );
    });
  });
});
