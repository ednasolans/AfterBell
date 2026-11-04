import {
  CITY_MAX_LENGTH,
  COUNTRY_MAX_LENGTH,
  EMPTY_ADDRESS_FORM,
  formatAddress,
  PROVINCE_MAX_LENGTH,
  SHORT_FIELD_MAX_LENGTH,
  STREET_MAX_LENGTH,
  toAddress,
  toAddressInsert,
  validateAddress,
} from "./addresses";
import { MAIN_ADDRESS, SECOND_ADDRESS } from "@/test-utils/addressFixtures";

describe("validateAddress", () => {
  it("accepts a complete address", () => {
    expect(validateAddress(MAIN_ADDRESS)).toEqual({});
  });

  it("requires every field except the floor and the door", () => {
    expect(validateAddress({ ...EMPTY_ADDRESS_FORM, country: "" })).toEqual({
      street: "Street is required",
      number: "Number is required",
      postalCode: "Postal code is required",
      city: "City is required",
      province: "Province is required",
      country: "Country is required",
    });
  });

  it("starts with the country filled in", () => {
    expect(EMPTY_ADDRESS_FORM.country).toBe("Spain");
  });

  it("treats only spaces as empty", () => {
    expect(validateAddress({ ...MAIN_ADDRESS, street: "   " })).toEqual({
      street: "Street is required",
    });
  });

  it.each([
    ["street", "Street", STREET_MAX_LENGTH],
    ["number", "Number", SHORT_FIELD_MAX_LENGTH],
    ["floor", "Floor", SHORT_FIELD_MAX_LENGTH],
    ["door", "Door", SHORT_FIELD_MAX_LENGTH],
    ["postalCode", "Postal code", SHORT_FIELD_MAX_LENGTH],
    ["city", "City", CITY_MAX_LENGTH],
    ["province", "Province", PROVINCE_MAX_LENGTH],
    ["country", "Country", COUNTRY_MAX_LENGTH],
  ])("limits the length of %s to the database limit", (field, label, limit) => {
    expect(
      validateAddress({ ...MAIN_ADDRESS, [field]: "a".repeat(limit) }),
    ).toEqual({});
    expect(
      validateAddress({ ...MAIN_ADDRESS, [field]: "a".repeat(limit + 1) }),
    ).toEqual({ [field]: `${label} must be at most ${limit} characters` });
  });

  it("measures the length without surrounding spaces, as it is saved", () => {
    const street = ` ${"a".repeat(STREET_MAX_LENGTH)} `;
    expect(validateAddress({ ...MAIN_ADDRESS, street })).toEqual({});
  });
});

describe("formatAddress", () => {
  it("joins the address and the city", () => {
    expect(formatAddress({ address: "C/ Major 1", city: "Lleida" })).toBe(
      "C/ Major 1, Lleida",
    );
  });
});

describe("toAddress", () => {
  const ROW = {
    id: "address-1",
    address: "C/ Major 1",
    street: null,
    number: null,
    city: "Lleida",
  };

  it("keeps the text of an older address", () => {
    expect(toAddress(ROW)).toEqual({
      id: "address-1",
      address: "C/ Major 1",
      city: "Lleida",
    });
  });

  it("builds the text from the street and number of a structured address", () => {
    expect(
      toAddress({ ...ROW, address: null, street: "C/ Major", number: "1" }),
    ).toEqual({ id: "address-1", address: "C/ Major 1", city: "Lleida" });
  });

  it("uses only the street when there is no number", () => {
    expect(
      toAddress({ ...ROW, address: null, street: "C/ Major" }).address,
    ).toBe("C/ Major");
  });
});

describe("toAddressInsert", () => {
  it("converts every field to its database column", () => {
    expect(toAddressInsert(SECOND_ADDRESS)).toEqual({
      street: "Av. Catalunya",
      number: "5",
      floor: "2",
      door: "B",
      postal_code: "25600",
      city: "Balaguer",
      province: "Lleida",
      country: "Spain",
    });
  });

  it("removes surrounding spaces", () => {
    const row = toAddressInsert({
      ...MAIN_ADDRESS,
      street: " C/ Major ",
      city: " Lleida ",
    });
    expect(row.street).toBe("C/ Major");
    expect(row.city).toBe("Lleida");
  });

  it("stores an empty floor and door as null", () => {
    const row = toAddressInsert({ ...MAIN_ADDRESS, door: "  " });
    expect(row.floor).toBeNull();
    expect(row.door).toBeNull();
  });
});
