import { type ActivityForm } from "../types";
import { toActivityInsert } from "./toActivityInsert";

const VALID_FORM: ActivityForm = {
  title: "  Swimming for kids ",
  description: "   ",
  category: "swimming",
  targetAgeRanges: ["7-9"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  priceMin: 30,
  priceMax: 40.5,
  pricePeriod: "per_month",
};

describe("toActivityInsert", () => {
  it("converts every field to its database column", () => {
    expect(toActivityInsert(VALID_FORM)).toEqual({
      title: "Swimming for kids",
      description: null,
      category: "swimming",
      target_age_ranges: ["7-9"],
      schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
      price_min: 30,
      price_max: 40.5,
      price_period: "per_month",
    });
  });

  it("does not send provider_id or type, so the database fills them", () => {
    const row = toActivityInsert(VALID_FORM);
    expect(row).not.toHaveProperty("provider_id");
    expect(row).not.toHaveProperty("type");
  });

  it("keeps a description that has text, without surrounding spaces", () => {
    const row = toActivityInsert({
      ...VALID_FORM,
      description: " Small groups ",
    });
    expect(row.description).toBe("Small groups");
  });

  it.each<Partial<ActivityForm>>([
    { category: null },
    { priceMin: null },
    { priceMax: null },
    { pricePeriod: null },
  ])("throws if the activity was not validated (%o)", (changes) => {
    expect(() => toActivityInsert({ ...VALID_FORM, ...changes })).toThrow();
  });
});
