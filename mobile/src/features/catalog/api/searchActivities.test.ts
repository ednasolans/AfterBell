import { type Tables } from "@/lib/database.types";

import {
  SEARCH_MAX_LENGTH,
  SEARCH_PAGE_SIZE,
  SEARCH_TOO_LONG_MESSAGE,
  SEARCH_TOO_SHORT_MESSAGE,
  searchActivities,
  trimSearchQuery,
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

    const result = await searchActivities("  musica ", 2);

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
    ["connection lost", "connection lost"],
  ])("turns the database error %s into a message", async (code, message) => {
    mockRpc.mockResolvedValue({ data: null, error: { message: code } });

    await expect(searchActivities("musica")).rejects.toThrow(message);
  });
});
