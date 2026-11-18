import { type Tables } from "@/lib/database.types";
import { NO_SEARCH_FILTERS, type SearchFilters } from "@/lib/searchFilters";

import {
  SEARCH_ERROR_MESSAGES,
  SEARCH_MAX_LENGTH,
  SEARCH_PAGE_SIZE,
  SEARCH_TOO_LONG_MESSAGE,
  SEARCH_TOO_SHORT_MESSAGE,
  countSearchActivities,
  searchActivities,
  trimSearchQuery,
  validateSearchFilters,
  validateSearchQuery,
} from "./searchActivities";

const mockRpc = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: { rpc: (name: string, args: unknown) => mockRpc(name, args) },
}));

const ROW: Tables<"activities"> = {
  id: "activity-1",
  provider_id: "provider-1",
  address_id: "address-1",
  title: "Música per a nens",
  description: null,
  category: "music",
  is_tutor: false,
  type: "whole_year",
  start_date: null,
  end_date: null,
  target_age_ranges: ["7-9"],
  schedule: [{ day: "monday", startTime: "17:00", endTime: "18:00" }],
  price: 20,
  price_period: "per_month",
  max_participants: 10,
  unlimited_participants: false,
  status: "published",
  search_normalized: "musica per a nens music",
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
};

beforeEach(() => mockRpc.mockReset());

describe("trimSearchQuery", () => {
  it("removes the spaces at both ends only", () => {
    expect(trimSearchQuery("  futbol  nens ")).toBe("futbol  nens");
  });
});

describe("validateSearchQuery", () => {
  it("accepts an empty text (no text filter)", () => {
    expect(validateSearchQuery("   ")).toBeNull();
  });

  it("rejects one character, even with spaces around", () => {
    expect(validateSearchQuery(" a ")).toBe(SEARCH_TOO_SHORT_MESSAGE);
  });

  it("accepts two characters", () => {
    expect(validateSearchQuery("ab")).toBeNull();
  });

  it("accepts the maximum length and rejects one more", () => {
    expect(validateSearchQuery("a".repeat(SEARCH_MAX_LENGTH))).toBeNull();
    expect(validateSearchQuery("a".repeat(SEARCH_MAX_LENGTH + 1))).toBe(
      SEARCH_TOO_LONG_MESSAGE,
    );
  });
});

describe("searchActivities", () => {
  it("sends the trimmed text and the page to the database", async () => {
    mockRpc.mockResolvedValue({ data: [ROW], error: null });

    const result = await searchActivities("  musica ", NO_SEARCH_FILTERS, 2);

    expect(mockRpc).toHaveBeenCalledWith("search_activities", {
      p_query: "musica",
      p_limit: SEARCH_PAGE_SIZE,
      p_offset: 2 * SEARCH_PAGE_SIZE,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "activity-1",
      providerId: "provider-1",
      title: "Música per a nens",
    });
  });

  it("starts at the first page by default", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await searchActivities("musica");

    expect(mockRpc).toHaveBeenCalledWith(
      "search_activities",
      expect.objectContaining({ p_offset: 0 }),
    );
  });

  it("does not call the database with a text that is too short", async () => {
    await expect(searchActivities("a")).rejects.toThrow(
      SEARCH_TOO_SHORT_MESSAGE,
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each([
    ["search_query_too_short", SEARCH_TOO_SHORT_MESSAGE],
    ["search_query_too_long", SEARCH_TOO_LONG_MESSAGE],
    [
      "search_unknown_category",
      "One of the selected categories does not exist.",
    ],
    [
      "search_invalid_age_range",
      SEARCH_ERROR_MESSAGES.search_invalid_age_range,
    ],
    ["search_unknown_price_period", "The price period is not valid."],
    ["connection lost", "connection lost"],
  ])("turns the database error %s into a message", async (code, message) => {
    mockRpc.mockResolvedValue({ data: null, error: { message: code } });

    await expect(searchActivities("musica")).rejects.toThrow(message);
  });

  it("sends every filter that is set", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await searchActivities("", {
      categories: ["music", "swimming"],
      ageMin: 6,
      ageMax: 9,
      city: " Lleida ",
      postalCode: "25001",
      priceMin: 10,
      priceMax: 50,
      pricePeriod: "per_month",
    });

    expect(mockRpc).toHaveBeenCalledWith("search_activities", {
      p_query: "",
      p_categories: ["music", "swimming"],
      p_age_min: 6,
      p_age_max: 9,
      p_city: "Lleida",
      p_postal_code: "25001",
      p_price_min: 10,
      p_price_max: 50,
      p_price_period: "per_month",
      p_limit: SEARCH_PAGE_SIZE,
      p_offset: 0,
    });
  });

  it("leaves out the filters that are not set, blank texts and no categories", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await searchActivities("musica", {
      ...NO_SEARCH_FILTERS,
      city: "   ",
      postalCode: "",
      ageMin: 0,
    });

    const args = mockRpc.mock.calls[0][1] as Record<string, unknown>;
    expect(args.p_categories).toBeUndefined();
    expect(args.p_city).toBeUndefined();
    expect(args.p_postal_code).toBeUndefined();
    expect(args.p_age_max).toBeUndefined();
    // 0 is a real age, not "no value"
    expect(args.p_age_min).toBe(0);
  });

  it("does not call the database with invalid filters", async () => {
    await expect(
      searchActivities("musica", { ...NO_SEARCH_FILTERS, priceMax: 20 }),
    ).rejects.toThrow(SEARCH_ERROR_MESSAGES.search_price_period_required);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("countSearchActivities", () => {
  it("sends the same text and filters as the search, without the page", async () => {
    mockRpc.mockResolvedValue({ data: 42, error: null });

    const total = await countSearchActivities("  musica ", {
      ...NO_SEARCH_FILTERS,
      categories: ["music"],
    });

    expect(total).toBe(42);
    expect(mockRpc).toHaveBeenCalledWith("count_search_activities", {
      p_query: "musica",
      p_categories: ["music"],
      p_age_min: undefined,
      p_age_max: undefined,
      p_city: undefined,
      p_postal_code: undefined,
      p_price_min: undefined,
      p_price_max: undefined,
      p_price_period: undefined,
    });
  });

  it("does not call the database with a text that is too short", async () => {
    await expect(countSearchActivities("a")).rejects.toThrow(
      SEARCH_TOO_SHORT_MESSAGE,
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("turns the database error into a message", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "search_query_too_long" },
    });

    await expect(countSearchActivities("musica")).rejects.toThrow(
      SEARCH_TOO_LONG_MESSAGE,
    );
  });
});

describe("validateSearchFilters", () => {
  const VALID: SearchFilters = {
    categories: ["music"],
    ageMin: 6,
    ageMax: 9,
    city: "Lleida",
    postalCode: "25001",
    priceMin: 10,
    priceMax: 50,
    pricePeriod: "per_month",
  };

  it("accepts valid filters and no filters at all", () => {
    expect(validateSearchFilters(VALID)).toBeNull();
    expect(validateSearchFilters(NO_SEARCH_FILTERS)).toBeNull();
  });

  it.each([
    ["a negative minimum age", { ageMin: -1 }, "search_negative_age"],
    ["a negative maximum age", { ageMax: -1 }, "search_negative_age"],
    [
      "a minimum age above the maximum",
      { ageMin: 10, ageMax: 9 },
      "search_invalid_age_range",
    ],
    ["a negative minimum price", { priceMin: -0.01 }, "search_negative_price"],
    ["a negative maximum price", { priceMax: -1 }, "search_negative_price"],
    [
      "a minimum price above the maximum",
      { priceMin: 50.01, priceMax: 50 },
      "search_invalid_price_range",
    ],
    [
      "a minimum price without period",
      { pricePeriod: null, priceMax: null },
      "search_price_period_required",
    ],
    [
      "a maximum price without period",
      { pricePeriod: null, priceMin: null },
      "search_price_period_required",
    ],
  ])("rejects %s", (_name, change, code) => {
    expect(validateSearchFilters({ ...VALID, ...change })).toBe(
      SEARCH_ERROR_MESSAGES[code],
    );
  });

  it("accepts the same minimum and maximum, and zero", () => {
    expect(
      validateSearchFilters({
        ...VALID,
        ageMin: 0,
        ageMax: 0,
        priceMin: 0,
        priceMax: 0,
      }),
    ).toBeNull();
  });

  it("accepts only a minimum or only a maximum", () => {
    expect(
      validateSearchFilters({ ...VALID, ageMax: null, priceMax: null }),
    ).toBeNull();
    expect(
      validateSearchFilters({ ...VALID, ageMin: null, priceMin: null }),
    ).toBeNull();
  });

  it("accepts a period without prices", () => {
    expect(
      validateSearchFilters({ ...NO_SEARCH_FILTERS, pricePeriod: "per_hour" }),
    ).toBeNull();
  });

  it("does not change the filters", () => {
    const filters = { ...VALID, categories: [...VALID.categories] };
    validateSearchFilters(filters);
    expect(filters).toEqual(VALID);
  });
});
