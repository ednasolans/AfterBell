import { supabase } from "@/lib/supabase";
import {
  createQueryBuilderMock,
  type QueryBuilderMock,
} from "@/test-utils/supabaseQueryMock";

import { type ActivityForm } from "../types";
import { deleteActivity } from "./deleteActivity";
import { fetchActivity } from "./fetchActivity";
import { fetchMyActivities } from "./fetchMyActivities";
import { toActivity, type ActivityRow } from "./toActivity";
import { toActivityInsert } from "./toActivityInsert";
import { updateActivity } from "./updateActivity";

// Replace the real client: tests must not need a database
jest.mock("@/lib/supabase", () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));

const ROW: ActivityRow = {
  id: "activity-1",
  provider_id: "provider-1",
  title: "Swimming for kids",
  description: null,
  category: "swimming",
  type: "whole_year",
  target_age_ranges: ["7-9"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  price_min: 30,
  price_max: 40,
  price_period: "per_month",
  max_participants: 12,
  address_id: "address-1",
  created_at: "2026-10-20T08:00:00Z",
};

const FORM: ActivityForm = {
  title: "Swimming for kids",
  description: "",
  category: "swimming",
  targetAgeRanges: ["7-9"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  priceMin: 30,
  priceMax: 45,
  pricePeriod: "per_month",
  maxParticipants: 12,
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
  it("returns the activity with the given id", async () => {
    const query = mockQuery({ data: ROW, error: null });

    const activity = await fetchActivity("activity-1");

    expect(query.eq).toHaveBeenCalledWith("id", "activity-1");
    expect(activity).toEqual(toActivity(ROW));
  });

  it("throws when the database returns an error", async () => {
    mockQuery({ data: null, error: DATABASE_ERROR });

    await expect(fetchActivity("activity-1")).rejects.toThrow("database error");
  });
});

describe("updateActivity", () => {
  it("updates the activity with the mapped values", async () => {
    const query = mockQuery({ data: [{ id: "activity-1" }], error: null });

    await updateActivity({ id: "activity-1", form: FORM });

    expect(query.update).toHaveBeenCalledWith(toActivityInsert(FORM));
    expect(query.eq).toHaveBeenCalledWith("id", "activity-1");
  });

  it("throws when no row was updated (another provider's activity)", async () => {
    mockQuery({ data: [], error: null });

    await expect(
      updateActivity({ id: "activity-1", form: FORM }),
    ).rejects.toThrow("cannot edit");
  });

  it("throws when the database returns an error", async () => {
    mockQuery({ data: null, error: DATABASE_ERROR });

    await expect(
      updateActivity({ id: "activity-1", form: FORM }),
    ).rejects.toThrow("database error");
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
