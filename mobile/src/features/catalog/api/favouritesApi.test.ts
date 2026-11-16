import { addFavourite } from "./addFavourite";
import { fetchFavourites } from "./fetchFavourites";
import { removeFavourite } from "./removeFavourite";

type Result = {
  data?: unknown;
  error: { message: string; code?: string } | null;
};

const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table);
      return {
        insert: (row: unknown) => mockInsert(row),
        delete: () => {
          mockDelete();
          return {
            eq: (column: string, value: unknown) => mockEq(column, value),
          };
        },
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

  it("saves an activity without sending the customer: the database fills it in", async () => {
    mockInsert.mockResolvedValue({ error: null } satisfies Result);

    await addFavourite("a1");

    expect(mockFrom).toHaveBeenCalledWith("favourites");
    expect(mockInsert).toHaveBeenCalledWith({ activity_id: "a1" });
  });

  it("an activity saved twice is not an error", async () => {
    mockInsert.mockResolvedValue({
      error: { message: "duplicate key", code: "23505" },
    } satisfies Result);

    await expect(addFavourite("a1")).resolves.toBeUndefined();
  });

  it("fails when the activity cannot be saved", async () => {
    mockInsert.mockResolvedValue({
      error: {
        message: "new row violates row-level security policy",
        code: "42501",
      },
    } satisfies Result);

    await expect(addFavourite("a1")).rejects.toThrow(
      "new row violates row-level security policy",
    );
  });

  it("removes one activity from the favourites", async () => {
    mockEq.mockResolvedValue({ error: null } satisfies Result);

    await removeFavourite("a1");

    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("activity_id", "a1");
  });

  it("fails when the favourite cannot be removed", async () => {
    mockEq.mockResolvedValue({ error: { message: "boom" } } satisfies Result);

    await expect(removeFavourite("a1")).rejects.toThrow("boom");
  });

  it("lists the favourites with what the card needs", async () => {
    mockRpc.mockResolvedValue({ data: [favouriteRow], error: null });

    const result = await fetchFavourites();

    expect(mockRpc).toHaveBeenCalledWith("my_favourites", { p_limit: 100 });
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

    const [favourite] = await fetchFavourites();

    expect(favourite.available).toBe(false);
    expect(favourite.activity.startDate).toBeNull();
    expect(favourite.providerName).toBeNull();
  });

  it("fails when the favourites cannot be read", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(fetchFavourites()).rejects.toThrow("boom");
  });
});
