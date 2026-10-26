import { type ActivityForm } from "../types";
import { type TablesInsert, type TablesUpdate } from "@/lib/database.types";
import { toActivityUpdate, toActivityInsert } from "./toActivityInsert";
export type ActivityInsert = TablesInsert<"activities">;
export type ActivityUpdate = TablesUpdate<"activities">;

const VALID_FORM: ActivityForm = {
  title: "  Swimming for kids ",
  description: "   ",
  category: "swimming",
  type: "whole_year",
  targetAgeRanges: ["7-9", "10-12"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  price: 30,
  pricePeriod: "per_month",
  maxParticipants: 12,
  addressId: "address-1",
};

describe("toActivityInsert", () => {
  it("converts every field to its database column", () => {
    expect(toActivityInsert(VALID_FORM)).toEqual({
      title: "Swimming for kids",
      description: null,
      category: "swimming",
      type: "whole_year",
      target_age_ranges: ["7-9", "10-12"],
      schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
      price: 30,
      price_period: "per_month",
      max_participants: 12,
      address_id: "address-1",
    });
  });

  it("does not send provider_id, so the database fills it", () => {
    const row = toActivityInsert(VALID_FORM);
    expect(row).not.toHaveProperty("provider_id");
  });

  it("keeps a description that has text, without surrounding spaces", () => {
    const row = toActivityInsert({
      ...VALID_FORM,
      description: " Small groups ",
    });
    expect(row.description).toBe("Small groups");
  });

  it("copies schedule objects into plain JSON objects", () => {
    const row = toActivityInsert({
      ...VALID_FORM,
      schedule: [
        { day: "monday", startTime: "17:00", endTime: "18:00" },
        { day: "friday", startTime: "10:00", endTime: "11:30" },
      ],
    });
    expect(row.schedule).toEqual([
      { day: "monday", startTime: "17:00", endTime: "18:00" },
      { day: "friday", startTime: "10:00", endTime: "11:30" },
    ]);
  });

  it.each<Partial<ActivityForm>>([
    { price: null },
    { pricePeriod: null },
    { maxParticipants: null },
    { category: null },
    { addressId: null },
  ])("throws if the activity was not validated (%o)", (changes) => {
    expect(() => toActivityInsert({ ...VALID_FORM, ...changes })).toThrow();
  });
});

describe("toActivityUpdate", () => {
  it("sends the editable fields but not the type, which cannot be changed", () => {
    const row = toActivityUpdate(VALID_FORM);

    expect(row).not.toHaveProperty("type");
    expect(row).toEqual({
      title: "Swimming for kids",
      description: null,
      category: "swimming",
      target_age_ranges: ["7-9", "10-12"],
      schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
      price: 30,
      price_period: "per_month",
      max_participants: 12,
      address_id: "address-1",
    });
  });
});
