import { ACTIVITY } from "@/test-utils/activityFixtures";

import { toActivityForm } from "./toActivityForm";
import { toActivityInsert } from "./toActivityInsert";

describe("toActivityForm", () => {
  it("restores all editable whole-year activity values", () => {
    expect(toActivityForm(ACTIVITY)).toEqual({
      title: ACTIVITY.title,
      description: ACTIVITY.description,
      category: ACTIVITY.category,
      type: "whole_year",
      startDate: null,
      endDate: null,
      targetAgeRanges: ACTIVITY.targetAgeRanges,
      schedule: ACTIVITY.schedule,
      price: ACTIVITY.price,
      pricePeriod: ACTIVITY.pricePeriod,
      maxParticipants: ACTIVITY.maxParticipants,
      addressId: ACTIVITY.addressId,
    });
  });

  it("restores an empty description for a saved NULL", () => {
    expect(toActivityForm({ ...ACTIVITY, description: null }).description).toBe(
      "",
    );
  });

  describe.each(["event", "temporary"] as const)("%s editing", (type) => {
    it.each([{ schedule: [] }, { schedule: ACTIVITY.schedule }])(
      "preserves dates and slots when reopening and saving (%j)",
      ({ schedule }) => {
        const saved = {
          ...ACTIVITY,
          type,
          startDate: "2027-07-01",
          endDate: "2027-07-15",
          schedule,
        };
        const before = JSON.parse(JSON.stringify(saved));
        const form = toActivityForm(saved);

        expect(form).toMatchObject({
          type,
          startDate: saved.startDate,
          endDate: saved.endDate,
          schedule,
        });
        expect(toActivityInsert(form)).toMatchObject({
          type,
          start_date: saved.startDate,
          end_date: saved.endDate,
          schedule: schedule.length === 0 ? null : schedule,
        });
        expect(saved).toEqual(before);
      },
    );

    it("clears saved dates after changing to whole-year", () => {
      const form = toActivityForm({
        ...ACTIVITY,
        type,
        startDate: "2027-07-01",
        endDate: "2027-07-15",
      });

      expect(toActivityInsert({ ...form, type: "whole_year" })).toMatchObject({
        type: "whole_year",
        start_date: null,
        end_date: null,
        schedule: ACTIVITY.schedule,
      });
    });
  });
});
