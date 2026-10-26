import { type ActivityForm } from "./types";
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  validateActivity,
} from "./validation";

const VALID_ACTIVITY: ActivityForm = {
  title: "Saturday workshop",
  description: "Fun for everyone",
  minAge: 7,
  maxAge: 12,
  schedule: ["Tuesday 17:00-18:00"],
  price: 15,
  startDate: "2026-10-01",
  endDate: "2026-12-31",
  addressId: "address-1",
  status: "draft",
};

function errorsOf(changes: Partial<ActivityForm>) {
  return validateActivity({ ...VALID_ACTIVITY, ...changes });
}

describe("validateActivity", () => {
  it("accepts a valid activity", () => {
    expect(validateActivity(VALID_ACTIVITY)).toEqual({});
  });

  describe("title", () => {
    it.each(["", "   "])("is required (%j)", (title) => {
      expect(errorsOf({ title }).title).toBeDefined();
    });

    it("can have the maximum length", () => {
      expect(errorsOf({ title: "a".repeat(TITLE_MAX_LENGTH) }).title).toBeUndefined();
    });

    it("cannot be longer than the maximum", () => {
      expect(errorsOf({ title: "a".repeat(TITLE_MAX_LENGTH + 1) }).title).toBeDefined();
    });
  });

  describe("description", () => {
    it("is optional", () => {
      expect(errorsOf({ description: "" }).description).toBeUndefined();
    });

    it("cannot be longer than the maximum", () => {
      const description = "a".repeat(DESCRIPTION_MAX_LENGTH + 1);
      expect(errorsOf({ description }).description).toBeDefined();
    });
  });

  describe("place", () => {
    it("requires an address", () => {
      expect(errorsOf({ addressId: null }).addressId).toBeDefined();
    });
  });

  describe("schedule", () => {
    it("requires at least one time slot", () => {
      expect(errorsOf({ schedule: [] }).schedule).toBeDefined();
    });

    it("does not accept a schedule with only empty lines", () => {
      expect(errorsOf({ schedule: ["", "  "] }).schedule).toBeDefined();
    });

    it("ignores the empty lines between time slots", () => {
      const schedule = ["Monday 17:00-18:00", "  ", ""];
      expect(errorsOf({ schedule }).schedule).toBeUndefined();
    });

    it("accepts several time slots", () => {
      const schedule = ["Monday 17:00-18:00", "Friday 10:00-11:30"];
      expect(errorsOf({ schedule }).schedule).toBeUndefined();
    });
  });

  describe("ages", () => {
    it("requires both ages", () => {
      const errors = errorsOf({ minAge: null, maxAge: null });
      expect(errors.minAge).toBeDefined();
      expect(errors.maxAge).toBeDefined();
    });

    it.each([-1, 1.5])("does not accept %p as the minimum age", (minAge) => {
      expect(errorsOf({ minAge }).minAge).toBeDefined();
    });

    it.each([-1, 1.5])("does not accept %p as the maximum age", (maxAge) => {
      expect(errorsOf({ maxAge }).maxAge).toBeDefined();
    });

    it("does not accept a maximum age below the minimum", () => {
      expect(errorsOf({ minAge: 10, maxAge: 5 }).maxAge).toBeDefined();
    });

    it("accepts the same minimum and maximum age", () => {
      expect(errorsOf({ minAge: 8, maxAge: 8 })).toEqual({});
    });

    it("accepts 0 as the minimum age", () => {
      expect(errorsOf({ minAge: 0 }).minAge).toBeUndefined();
    });

    it("does not compare with an invalid minimum age", () => {
      const errors = errorsOf({ minAge: -1, maxAge: -5 });
      expect(errors.minAge).toBeDefined();
      expect(errors.maxAge).toBeDefined();
    });
  });

  describe("price", () => {
    it("is required", () => {
      expect(errorsOf({ price: null }).price).toBeDefined();
    });

    it.each([-5, 9.99])("does not accept %p", (price) => {
      expect(errorsOf({ price }).price).toBeDefined();
    });

    it("accepts 0 for a free activity", () => {
      expect(errorsOf({ price: 0 }).price).toBeUndefined();
    });
  });

  describe("dates", () => {
    it("are optional", () => {
      expect(errorsOf({ startDate: "", endDate: "" })).toEqual({});
    });

    it("accepts only a start date or only an end date", () => {
      expect(errorsOf({ endDate: "" })).toEqual({});
      expect(errorsOf({ startDate: "" })).toEqual({});
    });

    it.each(["01/10/2026", "2026-1-1", "tomorrow", "2026-02-31"])(
      "does not accept %j as the start date",
      (startDate) => {
        expect(errorsOf({ startDate }).startDate).toBeDefined();
      },
    );

    it.each(["01/10/2026", "tomorrow", "2026-13-01"])(
      "does not accept %j as the end date",
      (endDate) => {
        expect(errorsOf({ endDate }).endDate).toBeDefined();
      },
    );

    it("does not accept an end date before the start date", () => {
      const errors = errorsOf({ startDate: "2026-12-31", endDate: "2026-10-01" });
      expect(errors.endDate).toBeDefined();
      expect(errors.startDate).toBeUndefined();
    });

    it("accepts an activity that starts and ends the same day", () => {
      expect(errorsOf({ startDate: "2026-10-01", endDate: "2026-10-01" })).toEqual({});
    });

    it("does not compare with an invalid start date", () => {
      const errors = errorsOf({ startDate: "tomorrow", endDate: "2026-10-01" });
      expect(errors.startDate).toBeDefined();
      expect(errors.endDate).toBeUndefined();
    });
  });
});