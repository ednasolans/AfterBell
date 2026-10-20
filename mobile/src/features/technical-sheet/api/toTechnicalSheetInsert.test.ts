import { type TechnicalSheetForm } from "../types";
import { toTechnicalSheetInsert } from "./toTechnicalSheetInsert";

const VALID_SHEET: TechnicalSheetForm = {
  name: "  Lleida Swimming Club ",
  providerType: "sports_club",
  description: "",
  addresses: [{ address: "C/ Major 1", city: "Lleida" }],
  phoneNumber: "973 000 000",
  email: "",
  website: "   ",
  activityTypes: ["swimming"],
  facilities: ["showers"],
};

describe("toTechnicalSheetInsert", () => {
  it("converts every field to its database column", () => {
    expect(toTechnicalSheetInsert(VALID_SHEET, "address-1")).toEqual({
      name: "Lleida Swimming Club",
      provider_type: "sports_club",
      description: null,
      address_id: "address-1",
      phone_number: "973 000 000",
      email: null,
      website: null,
      activity_types: ["swimming"],
      facilities: ["showers"],
    });
  });

  it("does not send provider_id, so the database uses the logged-in user", () => {
    expect(toTechnicalSheetInsert(VALID_SHEET, "address-1")).not.toHaveProperty(
      "provider_id",
    );
  });

  it("keeps optional fields that have a value, without surrounding spaces", () => {
    const row = toTechnicalSheetInsert(
      {
        ...VALID_SHEET,
        email: " info@club.cat ",
      },
      "address-1",
    );
    expect(row.email).toBe("info@club.cat");
  });

  it.each<Partial<TechnicalSheetForm>>([{ providerType: null }])(
    "throws if the sheet was not validated (%o)",
    (changes) => {
      expect(() =>
        toTechnicalSheetInsert({ ...VALID_SHEET, ...changes }, "address-1"),
      ).toThrow();
    },
  );
});
