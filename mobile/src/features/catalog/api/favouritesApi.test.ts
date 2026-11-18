import { addFavourite } from "./addFavourite";
import { fetchFavourites } from "./fetchFavourites";
import { removeFavourite } from "./removeFavourite";

type Result = {
  data?: unknown;
  error: { message: string; code?: string } | null;
};

const PROFILE_ID = "family-profile-1";
const TARGET = { familyProfileId: PROFILE_ID, activityId: "a1" };

const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockRpc = jest.fn();
const mockFrom = jest.fn();

// delete().eq().eq(): every eq is recorded, and awaiting gives mockDelete's result
function mockDeleteBuilder() {
  const builder = {
    eq: (column: string, value: unknown) => {
      mockEq(column, value);
      return builder;
    },
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(mockDelete()).then(resolve),
  };
  return builder;
}

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table);
      return {
        insert: (row: unknown) => mockInsert(row),
        delete: () => mockDeleteBuilder(),
      };
    },
    rpc: (name: string, args: unknown) => mockRpc(name, args),
  },
}));

const favouriteRow = {
  activity_id: "a1",
  title: "Saturday workshop",
  category: "football",
  type: "temporary",
  start_date: "2099-07-01",
  end_date: "2099-07-15",
  target_age_ranges: ["7-9"],
  price: 15,
  price_period: "per_month",
  provider_name: "Sports Club",
  available: true,
  created_at: "2026-11-01T10:00:00Z",
};

describe("favourites API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saves an activity for a family profile", async () => {
    mockInsert.mockResolvedValue({ error: null } satisfies Result);

    await addFavourite(TARGET);

    expect(mockFrom).toHaveBeenCalledWith("favourites");
    expect(mockInsert).toHaveBeenCalledWith({
      family_profile_id: PROFILE_ID,
      activity_id: "a1",
    });
  });

  it("an activity saved twice is not an error", async () => {
    mockInsert.mockResolvedValue({
      error: { message: "duplicate key", code: "23505" },
    } satisfies Result);

    await expect(addFavourite(TARGET)).resolves.toBeUndefined();
  });

  it("fails when the activity cannot be saved", async () => {
    mockInsert.mockResolvedValue({
      error: {
        message: "new row violates row-level security policy",
        code: "42501",
      },
    } satisfies Result);

    await expect(addFavourite(TARGET)).rejects.toThrow(
      "new row violates row-level security policy",
    );
  });

  it("removes one activity from the favourites of that profile only", async () => {
    mockDelete.mockReturnValue({ error: null } satisfies Result);

    await removeFavourite(TARGET);

    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("family_profile_id", PROFILE_ID);
    expect(mockEq).toHaveBeenCalledWith("activity_id", "a1");
  });

  it("fails when the favourite cannot be removed", async () => {
    mockDelete.mockReturnValue({ error: { message: "boom" } } satisfies Result);

    await expect(removeFavourite(TARGET)).rejects.toThrow("boom");
  });

  it("lists the favourites with what the card needs", async () => {
    mockRpc.mockResolvedValue({ data: [favouriteRow], error: null });

    const result = await fetchFavourites(PROFILE_ID);

    expect(mockRpc).toHaveBeenCalledWith("my_favourites", {
      p_family_profile_id: PROFILE_ID,
      p_limit: 100,
    });
    expect(result).toEqual([
      {
        activity: {
          id: "a1",
          title: "Saturday workshop",
          category: "football",
          type: "temporary",
          startDate: "2099-07-01",
          endDate: "2099-07-15",
          targetAgeRanges: ["7-9"],
          price: 15,
          pricePeriod: "per_month",
        },
        providerName: "Sports Club",
        available: true,
        savedAt: "2026-11-01T10:00:00Z",
      },
    ]);
  });

  it("keeps the favourites that are no longer available, without dates or provider", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          ...favouriteRow,
          type: "whole_year",
          start_date: null,
          end_date: null,
          provider_name: null,
          available: false,
        },
      ],
      error: null,
    });

    const [favourite] = await fetchFavourites(PROFILE_ID);

    expect(favourite.available).toBe(false);
    expect(favourite.activity.startDate).toBeNull();
    expect(favourite.providerName).toBeNull();
  });

  it("fails when the favourites cannot be read", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(fetchFavourites(PROFILE_ID)).rejects.toThrow("boom");
  });
});
