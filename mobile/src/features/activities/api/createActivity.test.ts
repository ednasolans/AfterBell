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
  targetAgeRanges: ["7-9"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  priceMin: 30,
  priceMax: 40,
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
});
