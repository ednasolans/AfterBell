import { supabase } from "@/lib/supabase";

import { type ActivityForm } from "../types";
import { createActivity } from "./createActivity";
import { toActivityInsert } from "./toActivityInsert";

// Replace the real client: tests must not need a database
jest.mock("@/lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

const FORM: ActivityForm = {
  title: "Swimming for kids",
  description: "",
  category: "swimming",
  type: "whole_year",
  startDate: null,
  endDate: null,
  targetAgeRanges: ["7-9", "10-12"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  price: 30,
  pricePeriod: "per_month",
  maxParticipants: 12,
  addressId: "address-1",
};

const insert = jest.fn();

beforeEach(() => {
  insert.mockReset();
  jest
    .mocked(supabase.from)
    .mockReturnValue({ insert } as unknown as ReturnType<typeof supabase.from>);
});

describe("createActivity", () => {
  it("inserts the mapped row into activities", async () => {
    insert.mockResolvedValue({ error: null });

    await createActivity(FORM);

    expect(supabase.from).toHaveBeenCalledWith("activities");
    expect(insert).toHaveBeenCalledWith(toActivityInsert(FORM));
  });

  it("throws when the database rejects the row", async () => {
    insert.mockResolvedValue({
      error: { message: "new row violates row-level security policy" },
    });

    await expect(createActivity(FORM)).rejects.toThrow("row-level security");
  });
  it.each([{ schedule: [] }, { schedule: FORM.schedule }])(
    "creates an event through activities with optional slots (%j)",
    async ({ schedule }) => {
      insert.mockResolvedValue({ error: null });

      await createActivity({
        ...FORM,
        type: "event",
        startDate: "2027-07-01",
        endDate: "2027-07-15",
        schedule,
      });

      expect(supabase.from).toHaveBeenCalledWith("activities");
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "event",
          start_date: "2027-07-01",
          end_date: "2027-07-15",
          schedule: schedule.length === 0 ? null : schedule,
        }),
      );
      expect(insert.mock.calls[0][0]).not.toHaveProperty("status");
    },
  );
});
