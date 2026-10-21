import {
  ADDRESS_MAX_LENGTH,
  CITY_MAX_LENGTH,
  EMPTY_ADDRESS_FORM,
  formatAddress,
  toAddressInsert,
  validateAddress,
} from "./addresses";

describe("validateAddress", () => {
  it("accepts an address with a street and a city", () => {
    expect(validateAddress({ address: "C/ Major 1", city: "Lleida" })).toEqual(
      {},
    );
  });

  it("requires the address and the city", () => {
    expect(validateAddress(EMPTY_ADDRESS_FORM)).toEqual({
      address: "Address is required",
      city: "City is required",
    });
  });

  it("treats only spaces as empty", () => {
    expect(validateAddress({ address: "   ", city: "  " })).toEqual({
      address: "Address is required",
      city: "City is required",
    });
  });

  it("rejects texts longer than the database limits", () => {
    const errors = validateAddress({
      address: "a".repeat(ADDRESS_MAX_LENGTH + 1),
      city: "c".repeat(CITY_MAX_LENGTH + 1),
    });

    expect(errors.address).toBe(
      `Address must be at most ${ADDRESS_MAX_LENGTH} characters`,
    );
    expect(errors.city).toBe(
      `City must be at most ${CITY_MAX_LENGTH} characters`,
    );
  });

  it("measures the length without surrounding spaces, as it is saved", () => {
    const address = ` ${"a".repeat(ADDRESS_MAX_LENGTH)} `;
    expect(validateAddress({ address, city: "Lleida" })).toEqual({});
  });
});

describe("formatAddress", () => {
  it("joins the address and the city", () => {
    expect(formatAddress({ address: "C/ Major 1", city: "Lleida" })).toBe(
      "C/ Major 1, Lleida",
    );
  });
});

describe("toAddressInsert", () => {
  it("trims the texts and does not send provider_id", () => {
    expect(
      toAddressInsert({ address: " C/ Major 1 ", city: " Lleida " }),
    ).toEqual({ address: "C/ Major 1", city: "Lleida" });
  });
});
