import { type Activity, toActivity, type ActivityRow } from "./activity";

const ROW: ActivityRow = {
  id: "activity-1",
  provider_id: "provider-1",
  address_id: "address-1",
  title: "Swimming for kids",
  description: null,
  category: "swimming",
  type: "whole_year",
  target_age_ranges: ["7-9", "10-12"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  price: 30,
  price_period: "per_month",
  max_participants: 12,
  created_at: "2026-10-20T08:00:00Z",
};

describe("toActivity", () => {
  it("maps the database activity row to the shared activity type", () => {
    const activity: Activity = toActivity(ROW);

    expect(activity).toEqual({
      id: "activity-1",
      providerId: "provider-1",
      addressId: "address-1",
      title: "Swimming for kids",
      description: null,
      category: "swimming",
      type: "whole_year",
      targetAgeRanges: ["7-9", "10-12"],
      schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
      price: 30,
      pricePeriod: "per_month",
      maxParticipants: 12,
      createdAt: "2026-10-20T08:00:00Z",
    });
  });
});
