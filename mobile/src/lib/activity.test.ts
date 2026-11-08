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
  start_date: null,
  end_date: null,
  status: "published",
  is_tutor: false,
  search_normalized: "swimming for kids",
  updated_at: "2026-10-20T08:00:00Z",
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
      startDate: null,
      endDate: null,
      targetAgeRanges: ["7-9", "10-12"],
      schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
      price: 30,
      pricePeriod: "per_month",
      maxParticipants: 12,
      status: "published",
      createdAt: "2026-10-20T08:00:00Z",
    });
  });

  it("reads the dates of a temporary activity", () => {
    const activity = toActivity({
      ...ROW,
      type: "temporary",
      start_date: "2027-07-01",
      end_date: "2027-07-15",
    });

    expect(activity.type).toBe("temporary");
    expect(activity.startDate).toBe("2027-07-01");
    expect(activity.endDate).toBe("2027-07-15");
  });

  it("uses an empty schedule when the activity has none", () => {
    expect(toActivity({ ...ROW, schedule: null }).schedule).toEqual([]);
  });
});
