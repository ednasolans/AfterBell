import { EMPTY_ACTIVITY_FORM, type ActivityForm } from "./types";
import {
  DESCRIPTION_MAX_LENGTH,
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  TITLE_MAX_LENGTH,
  validateActivity,
} from "./validation";

// A complete activity that passes every rule; each test changes only what it checks
const VALID_ACTIVITY: ActivityForm = {
  title: "Swimming for kids",
  description: "Learn to swim in small groups",
  category: "swimming",
  targetAgeRanges: ["7-9"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  priceMin: 30,
  priceMax: 40,
  pricePeriod: "per_month",
  maxParticipants: 12,
  addressId: "address-1",
};

describe("validateActivity", () => {
  it("accepts a complete activity", () => {
    expect(validateActivity(VALID_ACTIVITY)).toEqual({});
  });

  it("reports every required field of an empty activity", () => {
    const errors = validateActivity(EMPTY_ACTIVITY_FORM);
    expect(Object.keys(errors).sort()).toEqual(
      [
        "addressId",
        "category",
        "maxParticipants",
        "priceMax",
        "priceMin",
        "pricePeriod",
        "schedule",
        "targetAgeRanges",
        "title",
      ].sort(),
    );
  });

  it("requires the place of the activity", () => {
    expect(
      validateActivity({ ...VALID_ACTIVITY, addressId: null }).addressId,
    ).toBe("Choose where the activity takes place");
  });

  describe("details", () => {
    it("treats a title with only spaces as empty", () => {
      expect(
        validateActivity({ ...VALID_ACTIVITY, title: "   " }).title,
      ).toBeDefined();
    });

    it("accepts a title at the length limit and rejects a longer one", () => {
      const atLimit = "a".repeat(TITLE_MAX_LENGTH);
      expect(
        validateActivity({ ...VALID_ACTIVITY, title: atLimit }).title,
      ).toBeUndefined();
      expect(
        validateActivity({ ...VALID_ACTIVITY, title: `${atLimit}a` }).title,
      ).toBeDefined();
    });

    it("accepts an empty description and rejects one that is too long", () => {
      expect(validateActivity({ ...VALID_ACTIVITY, description: "" })).toEqual(
        {},
      );
      const tooLong = "a".repeat(DESCRIPTION_MAX_LENGTH + 1);
      expect(
        validateActivity({ ...VALID_ACTIVITY, description: tooLong })
          .description,
      ).toBeDefined();
    });
  });

  describe("maximum participants", () => {
    it("accepts the limits of the range", () => {
      expect(
        validateActivity({
          ...VALID_ACTIVITY,
          maxParticipants: MIN_PARTICIPANTS,
        }),
      ).toEqual({});
      expect(
        validateActivity({
          ...VALID_ACTIVITY,
          maxParticipants: MAX_PARTICIPANTS,
        }),
      ).toEqual({});
    });

    it.each([MIN_PARTICIPANTS - 1, MAX_PARTICIPANTS + 1])(
      "rejects %d",
      (maxParticipants) => {
        expect(
          validateActivity({ ...VALID_ACTIVITY, maxParticipants })
            .maxParticipants,
        ).toBeDefined();
      },
    );
  });

  describe("schedule", () => {
    it("rejects a schedule with an invalid time slot", () => {
      const schedule: ActivityForm["schedule"] = [
        { day: "monday", startTime: "17:00", endTime: "18:00" },
        { day: "friday", startTime: "19:00", endTime: "18:00" },
      ];
      expect(
        validateActivity({ ...VALID_ACTIVITY, schedule }).schedule,
      ).toBeDefined();
    });

    it("accepts several valid time slots", () => {
      const schedule: ActivityForm["schedule"] = [
        { day: "monday", startTime: "17:00", endTime: "18:00" },
        { day: "friday", startTime: "10:00", endTime: "11:30" },
      ];
      expect(validateActivity({ ...VALID_ACTIVITY, schedule })).toEqual({});
    });
  });

  describe("prices", () => {
    it("accepts free activities and equal prices", () => {
      expect(
        validateActivity({ ...VALID_ACTIVITY, priceMin: 0, priceMax: 0 }),
      ).toEqual({});
      expect(
        validateActivity({ ...VALID_ACTIVITY, priceMin: 40, priceMax: 40 }),
      ).toEqual({});
    });

    it("rejects a maximum price lower than the minimum, on the maximum only", () => {
      const errors = validateActivity({
        ...VALID_ACTIVITY,
        priceMin: 50,
        priceMax: 20,
      });
      expect(errors.priceMax).toBeDefined();
      expect(errors.priceMin).toBeUndefined();
    });

    it("rejects negative prices", () => {
      const errors = validateActivity({
        ...VALID_ACTIVITY,
        priceMin: -5,
        priceMax: -1,
      });
      expect(errors.priceMax).toBeDefined();
      expect(errors.priceMin).toBeDefined();
    });
  });
});
