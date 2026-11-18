import { supabase } from "@/lib/supabase";
import {
  createQueryBuilderMock,
  type QueryBuilderMock,
} from "@/test-utils/supabaseQueryMock";

import { type ActivityForm } from "../types";
import { deleteActivity } from "./deleteActivity";
import { fetchActivity } from "./fetchActivity";
import { fetchMyActivities } from "./fetchMyActivities";
import { toActivity, type ActivityRow } from "@/lib/activity";
import { updateActivity } from "./updateActivity";
import { toActivityInsert } from "./toActivityInsert";
import { toActivityForm } from "./toActivityForm";

// Replace the real client: tests must not need a database
jest.mock("@/lib/supabase", () => ({
  supabase: { rpc: jest.fn(), from: jest.fn(), auth: { getUser: jest.fn() } },
}));

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
  unlimited_participants: false,
  created_at: "2026-10-20T08:00:00Z",
  start_date: null,
  end_date: null,
  status: "published",
  is_tutor: false,
  search_normalized: "swimming for kids",
  updated_at: "2026-10-20T08:00:00Z",
};

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

const DATABASE_ERROR = { message: "database error" };

function mockQuery(
  result: Parameters<typeof createQueryBuilderMock>[0],
): QueryBuilderMock {
  const builder = createQueryBuilderMock(result);
  jest
    .mocked(supabase.from)
    .mockReturnValue(builder as unknown as ReturnType<typeof supabase.from>);
  return builder;
}

function mockLoggedInUser(id: string | null) {
  jest.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: id === null ? null : { id } },
    error: null,
  } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("fetchMyActivities", () => {
  it("returns the activities of the logged-in provider, newest first", async () => {
    mockLoggedInUser("provider-1");
    const query = mockQuery({ data: [ROW], error: null });

    const activities = await fetchMyActivities();

    expect(supabase.from).toHaveBeenCalledWith("activities");
    expect(query.eq).toHaveBeenCalledWith("provider_id", "provider-1");
    expect(query.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(activities).toEqual([toActivity(ROW)]);
  });

  it("throws when nobody is logged in", async () => {
    mockLoggedInUser(null);

    await expect(fetchMyActivities()).rejects.toThrow("logged in");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("throws when the database returns an error", async () => {
    mockLoggedInUser("provider-1");
    mockQuery({ data: null, error: DATABASE_ERROR });

    await expect(fetchMyActivities()).rejects.toThrow("database error");
  });
});

describe("fetchActivity", () => {
  it("restores a saved event without a weekly schedule for editing", async () => {
    mockQuery({
      data: {
        ...ROW,
        type: "event",
        start_date: "2027-07-01",
        end_date: "2027-07-15",
        schedule: null,
      },
      error: null,
    });

    const activity = await fetchActivity("activity-1");

    expect(toActivityForm(activity)).toMatchObject({
      type: "event",
      startDate: "2027-07-01",
      endDate: "2027-07-15",
      schedule: [],
    });
  });

  it("returns the activity with the given id", async () => {
    const languages = [{ language: "Catalan", level: "C1" }];
    const row = { ...ROW, is_tutor: true, languages };
    const query = mockQuery({ data: row, error: null });

    const activity = await fetchActivity("activity-1");

    expect(query.eq).toHaveBeenCalledWith("id", "activity-1");
    expect(query.select).toHaveBeenCalledWith("*, languages(language, level)");
    expect(activity).toMatchObject({ isTutor: true, languages });
  });

  it("throws when the database returns an error", async () => {
    mockQuery({ data: null, error: DATABASE_ERROR });

    await expect(fetchActivity("activity-1")).rejects.toThrow("database error");
  });
});

describe("updateActivity", () => {
  const rpc = jest.mocked(supabase.rpc);
  it.each([{ schedule: [] }, { schedule: FORM.schedule }])(
    "updates an event through activities with optional slots (%j)",
    async ({ schedule }) => {
      rpc.mockResolvedValue({ error: null } as Awaited<
        ReturnType<typeof supabase.rpc>
      >);

      await updateActivity({
        id: "activity-1",
        form: {
          ...FORM,
          type: "event",
          startDate: "2027-07-01",
          endDate: "2027-07-15",
          schedule,
        },
      });

      expect(rpc).toHaveBeenCalledWith("save_activity_with_languages", {
        p_activity_id: "activity-1",
        p_languages: [],
        p_activity: expect.objectContaining({
          type: "event",
          start_date: "2027-07-01",
          end_date: "2027-07-15",
          schedule: schedule.length === 0 ? null : schedule,
        }),
      });
      expect(rpc.mock.calls[0][1]).not.toHaveProperty("p_activity.status");
    },
  );

  it("updates an event to whole-year with both dates cleared", async () => {
    rpc.mockResolvedValue({ error: null } as Awaited<
      ReturnType<typeof supabase.rpc>
    >);
    const eventForm = toActivityForm({
      ...toActivity(ROW),
      type: "event",
      startDate: "2027-07-01",
      endDate: "2027-07-15",
    });

    await updateActivity({
      id: "activity-1",
      form: { ...eventForm, type: "whole_year" },
    });

    expect(rpc).toHaveBeenCalledWith("save_activity_with_languages", {
      p_activity_id: "activity-1",
      p_languages: [],
      p_activity: expect.objectContaining({
        type: "whole_year",
        start_date: null,
        end_date: null,
        schedule: FORM.schedule,
      }),
    });
  });

  it("updates the activity and its pairs together", async () => {
    rpc.mockResolvedValue({ error: null } as Awaited<
      ReturnType<typeof supabase.rpc>
    >);
    const form = {
      ...FORM,
      category: "language",
      languages: [{ language: "Catalan", level: "C1" }],
    };

    await updateActivity({ id: "activity-1", form });

    expect(rpc).toHaveBeenCalledWith("save_activity_with_languages", {
      p_activity_id: "activity-1",
      p_activity: toActivityInsert(form),
      p_languages: form.languages,
    });
  });

  it("does not send hidden pairs for other categories", async () => {
    rpc.mockResolvedValue({ error: null } as Awaited<
      ReturnType<typeof supabase.rpc>
    >);
    const form = {
      ...FORM,
      isTutor: true,
      languages: [{ language: "Catalan", level: "C1" }],
    };

    await updateActivity({ id: "activity-1", form });

    expect(rpc).toHaveBeenCalledWith("save_activity_with_languages", {
      p_activity_id: "activity-1",
      p_activity: expect.objectContaining({ is_tutor: true }),
      p_languages: [],
    });
  });

  it("throws when the caller cannot update the activity", async () => {
    rpc.mockResolvedValue({
      error: { message: "The activity does not exist or you cannot edit it" },
    } as Awaited<ReturnType<typeof supabase.rpc>>);

    await expect(
      updateActivity({ id: "activity-1", form: FORM }),
    ).rejects.toThrow("cannot edit");
  });
});

describe("deleteActivity", () => {
  it("deletes the activity with the given id", async () => {
    const query = mockQuery({ data: [{ id: "activity-1" }], error: null });

    await deleteActivity("activity-1");

    expect(query.delete).toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith("id", "activity-1");
  });

  it("throws when no row was deleted (another provider's activity)", async () => {
    mockQuery({ data: [], error: null });

    await expect(deleteActivity("activity-1")).rejects.toThrow("cannot delete");
  });

  it("throws when the database returns an error", async () => {
    mockQuery({ data: null, error: DATABASE_ERROR });

    await expect(deleteActivity("activity-1")).rejects.toThrow(
      "database error",
    );
  });
});
