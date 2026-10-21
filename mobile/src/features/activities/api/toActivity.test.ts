import { type Activity } from "../types";
import { toActivity, toActivityForm, type ActivityRow } from "./toActivity";

const ROW: ActivityRow = {
  id: "activity-1",
  provider_id: "provider-1",
  title: "Swimming for kids",
  description: null,
  category: "swimming",
  type: "whole_year",
  target_age_ranges: ["7-9"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  price_min: 30,
  price_max: 40,
  price_period: "per_month",
  max_participants: 12,
  created_at: "2026-10-20T08:00:00Z",
};

const ACTIVITY: Activity = {
  id: "activity-1",
  providerId: "provider-1",
  title: "Swimming for kids",
  description: null,
  category: "swimming",
  type: "whole_year",
  targetAgeRanges: ["7-9"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  priceMin: 30,
  priceMax: 40,
  pricePeriod: "per_month",
  maxParticipants: 12,
  createdAt: "2026-10-20T08:00:00Z",
};

describe("toActivity", () => {
  it("converts every column to its field", () => {
    expect(toActivity(ROW)).toEqual(ACTIVITY);
  });
});

describe("toActivityForm", () => {
  it("keeps only the fields of the form", () => {
    expect(toActivityForm(ACTIVITY)).toEqual({
      title: "Swimming for kids",
      description: "",
      category: "swimming",
      targetAgeRanges: ["7-9"],
      schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
      priceMin: 30,
      priceMax: 40,
      pricePeriod: "per_month",
      maxParticipants: 12,
    });
  });

  it("keeps a description that has text", () => {
    const form = toActivityForm({ ...ACTIVITY, description: "Small groups" });
    expect(form.description).toBe("Small groups");
  });
});
