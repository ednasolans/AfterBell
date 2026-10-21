import { formatPriceRange, parsePrice } from "./price";

describe("parsePrice", () => {
  it.each([
    ["30", 30],
    ["0", 0],
    ["30.5", 30.5],
    ["30,5", 30.5],
    ["12,99", 12.99],
    [" 45 ", 45],
    ["-5", -5],
  ])('parses "%s" as %d', (text, expected) => {
    expect(parsePrice(text)).toBe(expected);
  });

  it.each([
    "",
    "   ",
    "abc",
    "30abc",
    "1e3",
    "30,555",
    "30.",
    ",5",
    "1.000,50",
  ])('returns null for "%s"', (text) => {
    expect(parsePrice(text)).toBeNull();
  });
});

describe("formatPriceRange", () => {
  it("shows a single price when the minimum and the maximum are equal", () => {
    expect(formatPriceRange(30, 30, "per_month")).toBe("30 € per month");
  });

  it("shows the range when the prices are different", () => {
    expect(formatPriceRange(30, 40, "per_term")).toBe("30–40 € per term");
  });

  it("shows two decimals with a comma when needed", () => {
    expect(formatPriceRange(9.5, 12.99, "per_hour")).toBe(
      "9,50–12,99 € per hour",
    );
  });
});
