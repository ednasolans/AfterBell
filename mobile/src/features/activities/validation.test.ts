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

  describe("dates", () => {
    const TODAY = "2027-06-15";
    const TEMPORARY: ActivityForm = {
      ...VALID,
      type: "temporary",
      startDate: "2027-07-01",
      endDate: "2027-07-15",
    };
    const validate = (form: ActivityForm, original?: ActivityForm) =>
      validateActivity(form, original, TODAY);

    it("accepts a temporary activity with valid dates", () => {
      expect(validate(TEMPORARY)).toEqual({});
    });

    it("does not ask for dates on a whole-year activity", () => {
      expect(validate(VALID)).toEqual({});
    });

    it("requires both dates", () => {
      expect(
        validate({ ...TEMPORARY, startDate: null, endDate: null }),
      ).toEqual({
        startDate: "Choose the start date",
        endDate: "Choose the end date",
      });
    });

    it("accepts an activity of one day that starts today", () => {
      expect(
        validate({ ...TEMPORARY, startDate: TODAY, endDate: TODAY }),
      ).toEqual({});
    });

    it("rejects an end date before the start date", () => {
      expect(validate({ ...TEMPORARY, endDate: "2027-06-30" }).endDate).toBe(
        "The end date cannot be before the start date",
      );
    });

    it("rejects a start date in the past when creating", () => {
      expect(
        validate({ ...TEMPORARY, startDate: "2027-06-14" }).startDate,
      ).toBe("The start date cannot be in the past");
    });

    it("lets an activity that has already started be edited", () => {
      const started = { ...TEMPORARY, startDate: "2027-06-01" };

      expect(validate({ ...started, endDate: "2027-08-01" }, started)).toEqual(
        {},
      );
    });

    it("rejects moving the start date to another past date", () => {
      const started = { ...TEMPORARY, startDate: "2027-06-01" };

      expect(
        validate({ ...started, startDate: "2027-06-02" }, started).startDate,
      ).toBe("The start date cannot be in the past");
    });

    it("rejects a past start date when the type changes to temporary", () => {
      const saved = { ...VALID, startDate: "2027-06-01" };

      expect(
        validate({ ...TEMPORARY, startDate: "2027-06-01" }, saved).startDate,
      ).toBe("The start date cannot be in the past");
    });
  });
});
