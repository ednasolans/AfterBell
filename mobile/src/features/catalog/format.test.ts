import { formatAgeRange, formatDateRange, formatPrice } from "./format";

describe("formatAgeRange", () => {
  it("shows the youngest and the oldest age", () => {
    expect(formatAgeRange(7, 12)).toBe("7–12 years");
  });
});

describe("formatPrice", () => {
  it("shows the price in euros", () => {
    expect(formatPrice(15)).toBe("15 €");
  });

  it("says when the activity is free", () => {
    expect(formatPrice(0)).toBe("Free");
  });
});

describe("formatDateRange", () => {
  it("shows both dates", () => {
    expect(formatDateRange("2026-10-01", "2026-12-31")).toBe(
      "2026-10-01 – 2026-12-31",
    );
  });

  it("shows only the start date", () => {
    expect(formatDateRange("2026-10-01", null)).toBe("From 2026-10-01");
  });

  it("shows only the end date", () => {
    expect(formatDateRange(null, "2026-12-31")).toBe("Until 2026-12-31");
  });

  it("returns null without dates", () => {
    expect(formatDateRange(null, null)).toBeNull();
  });
});
