import {
  AGE_RANGE_BOUNDS,
  AGE_RANGE_LABELS,
  AGE_RANGES,
  ADULT_MIN_AGE,
  ageOn,
} from "./ages";

describe("age ranges", () => {
  it("has a non-empty label for every range", () => {
    AGE_RANGES.forEach((range) => {
      expect(AGE_RANGE_LABELS[range].trim()).not.toBe("");
    });
  });

  it("has bounds for every range, and adults have no maximum", () => {
    expect(AGE_RANGE_BOUNDS["7-9"]).toEqual({ ageMin: 7, ageMax: 9 });
    expect(AGE_RANGE_BOUNDS.adult).toEqual({
      ageMin: ADULT_MIN_AGE,
      ageMax: null,
    });
  });
});

describe("ageOn", () => {
  const today = new Date(2026, 10, 18); // 18 Nov 2026

  it("counts the birthday of this year when it has passed", () => {
    expect(ageOn("2018-03-01", today)).toBe(8);
  });

  it("counts the birthday on the same day", () => {
    expect(ageOn("2018-11-18", today)).toBe(8);
  });

  it("does not count a birthday one day later, in the same month", () => {
    expect(ageOn("2018-11-19", today)).toBe(7);
  });

  it("does not count a birthday later in the year", () => {
    expect(ageOn("2018-12-01", today)).toBe(7);
  });

  it("is 0 before the first birthday", () => {
    expect(ageOn("2026-01-01", today)).toBe(0);
  });
});
