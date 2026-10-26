import { EMPTY_ACTIVITY_FORM, type ActivityForm } from "./types";
import { validateActivity } from "./validation";

const VALID: ActivityForm = {
  ...EMPTY_ACTIVITY_FORM,
  title: "Swimming",
  category: "swimming",
  targetAgeRanges: ["7-9"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  price: 30,
  pricePeriod: "per_month",
  maxParticipants: 12,
  addressId: "address-1",
};

describe("validateActivity", () => {
  it("accepts a complete activity", () => {
    expect(validateActivity(VALID)).toEqual({});
  });

  it("requires the category, audience, schedule and place", () => {
    const errors = validateActivity({
      ...VALID,
      category: null,
      targetAgeRanges: [],
      schedule: [],
      addressId: null,
    });
    expect(errors.category).toBeDefined();
    expect(errors.targetAgeRanges).toBeDefined();
    expect(errors.schedule).toBeDefined();
    expect(errors.addressId).toBeDefined();
  });

  it("validates the price range and participant limit", () => {
    const errors = validateActivity({
      ...VALID,
      price: -1,
      maxParticipants: 0,
    });
    expect(errors.price).toBeDefined();
    expect(errors.maxParticipants).toBeDefined();
  });
});
