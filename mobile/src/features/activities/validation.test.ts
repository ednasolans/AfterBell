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

  it("does not ask for a maximum when there is no limit", () => {
    const errors = validateActivity({
      ...VALID,
      maxParticipants: null,
      unlimitedParticipants: true,
    });
    expect(errors.maxParticipants).toBeUndefined();
  });

  it("asks for a maximum when there is a limit", () => {
    const errors = validateActivity({ ...VALID, maxParticipants: null });
    expect(errors.maxParticipants).toBe(
      "Enter between 1 and 1000 participants",
    );
  });
});

describe("language pairs", () => {
  const languageActivity = { ...VALID, category: "language" };

  it.each([true, false])("allows an empty draft with isTutor=%s", (isTutor) => {
    expect(
      validateActivity({ ...languageActivity, isTutor }).languages,
    ).toBeUndefined();
  });

  it.each([true, false])(
    "requires a pair for published language activities with isTutor=%s",
    (isTutor) => {
      expect(
        validateActivity(
          { ...languageActivity, isTutor },
          VALID,
          undefined,
          true,
        ).languages,
      ).toBe("Add at least one language and level.");
    },
  );

  it("allows published tutoring in other categories without pairs", () => {
    expect(
      validateActivity({ ...VALID, isTutor: true }, VALID, undefined, true)
        .languages,
    ).toBeUndefined();
  });

  it.each([
    { language: "English", level: " " },
    { language: " ", level: "B1" },
  ])("rejects an incomplete pair (%o)", (pair) => {
    expect(
      validateActivity({ ...languageActivity, languages: [pair] }).languages,
    ).toBe("Enter a language and level for each entry.");
  });

  it("rejects duplicate pairs even with whitespace", () => {
    const languages = [
      { language: "English", level: "B1" },
      { language: " English ", level: "B1" },
    ];
    expect(validateActivity({ ...languageActivity, languages }).languages).toBe(
      "Enter each language and level combination once.",
    );
  });
});
