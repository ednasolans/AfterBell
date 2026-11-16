import { supabase } from "@/lib/supabase";

import { type ActivityForm } from "../types";
import { createActivity } from "./createActivity";
import { toActivityInsert } from "./toActivityInsert";

// Replace the real client: tests must not need a database
jest.mock("@/lib/supabase", () => ({
  supabase: { rpc: jest.fn() },
}));

const FORM: ActivityForm = {
  isTutor: false,
  languages: [],
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
  unlimitedParticipants: false,
  addressId: "address-1",
};

const rpc = jest.mocked(supabase.rpc);

beforeEach(() => {
  rpc.mockReset();
});

describe("createActivity", () => {
  it("saves the activity and trimmed language pairs in one request", async () => {
    rpc.mockResolvedValue({ error: null } as Awaited<
      ReturnType<typeof supabase.rpc>
    >);
    const form: ActivityForm = {
      ...FORM,
      category: "language",
      isTutor: true,
      languages: [{ language: " English ", level: " B1 " }],
    };

    await createActivity(form);

    expect(rpc).toHaveBeenCalledWith("save_activity_with_languages", {
      p_activity: toActivityInsert(form),
      p_languages: [{ language: "English", level: "B1" }],
    });
  });

  it("throws when the database rejects the row", async () => {
    rpc.mockResolvedValue({
      error: { message: "new row violates row-level security policy" },
    } as Awaited<ReturnType<typeof supabase.rpc>>);

    await expect(createActivity(FORM)).rejects.toThrow("row-level security");
  });
});
