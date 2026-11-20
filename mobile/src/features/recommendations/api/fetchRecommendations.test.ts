import { supabase } from "@/lib/supabase";
import { type Tables } from "@/lib/database.types";

import {
  DEFAULT_RECOMMENDATIONS_ERROR,
  fetchRecommendations,
  RECOMMENDATIONS_PAGE_SIZE,
  toRecommendationsPage,
} from "./fetchRecommendations";

jest.mock("@/lib/supabase", () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

const ROW: Tables<"activities"> = {
  id: "activity-1",
  provider_id: "provider-1",
  address_id: "address-1",
  title: "Football for kids",
  description: null,
  category: "football",
  is_tutor: false,
  type: "whole_year",
  start_date: null,
  end_date: null,
  target_age_ranges: ["7-9"],
  schedule: [{ day: "monday", startTime: "17:00", endTime: "18:00" }],
  price: 10,
  price_period: "per_month",
  max_participants: 10,
  status: "published",
  created_at: "2026-10-20T08:00:00Z",
  updated_at: "2026-10-20T08:00:00Z",
  search_normalized: "football for kids",
  unlimited_participants: false,
};

const BODY = {
  status: "OK",
  activities: [
    {
      activity: ROW,
      matched_profiles: [{ id: "profile-1", first_name: "Marc" }],
      matched_count: 1,
      distance_meters: 120,
    },
  ],
  pagination: { limit: 20, offset: 0, has_more: true },
};

const invoke = jest.mocked(supabase.functions.invoke);

function failWith(code?: string) {
  invoke.mockResolvedValue({
    data: null,
    error: {
      context: { json: () => Promise.resolve({ error: { code } }) },
    },
  } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("toRecommendationsPage", () => {
  it("maps the activity, the matched profiles and the distance", () => {
    const page = toRecommendationsPage(BODY);
    expect(page.status).toBe("OK");
    expect(page.hasMore).toBe(true);
    expect(page.recommendations).toHaveLength(1);
    expect(page.recommendations[0]).toMatchObject({
      activity: { id: "activity-1", providerId: "provider-1" },
      matchedProfiles: [{ id: "profile-1", firstName: "Marc" }],
      distanceMeters: 120,
    });
  });

  it("keeps a missing distance as null", () => {
    const body = {
      ...BODY,
      activities: [{ ...BODY.activities[0], distance_meters: null }],
    };
    expect(toRecommendationsPage(body).recommendations[0].distanceMeters).toBe(
      null,
    );
  });

  it.each(["NO_MATCHES", "NO_CITY", "NO_PROFILES", "INCOMPLETE_PROFILES"])(
    "keeps the status %s with an empty list",
    (status) => {
      const page = toRecommendationsPage({
        status,
        activities: [],
        pagination: { has_more: false },
      });
      expect(page).toEqual({ status, recommendations: [], hasMore: false });
    },
  );

  it.each([null, {}, { status: "OK" }, { status: "OTHER", activities: [] }])(
    "rejects a body the app does not understand: %j",
    (body) => {
      expect(() => toRecommendationsPage(body)).toThrow(
        DEFAULT_RECOMMENDATIONS_ERROR,
      );
    },
  );

  it("does not mutate its input", () => {
    const copy = structuredClone(BODY);
    toRecommendationsPage(BODY);
    expect(BODY).toEqual(copy);
  });
});

describe("fetchRecommendations", () => {
  it("asks the first page", async () => {
    invoke.mockResolvedValue({ data: BODY, error: null } as never);
    const page = await fetchRecommendations();
    expect(invoke).toHaveBeenCalledWith("recommendations", {
      body: { limit: RECOMMENDATIONS_PAGE_SIZE, offset: 0 },
    });
    expect(page.recommendations).toHaveLength(1);
  });

  it("asks the offset of a later page", async () => {
    invoke.mockResolvedValue({ data: BODY, error: null } as never);
    await fetchRecommendations(2);
    expect(invoke).toHaveBeenCalledWith("recommendations", {
      body: {
        limit: RECOMMENDATIONS_PAGE_SIZE,
        offset: 2 * RECOMMENDATIONS_PAGE_SIZE,
      },
    });
  });

  it("turns the error code of the function into a message", async () => {
    failWith("forbidden");
    await expect(fetchRecommendations()).rejects.toThrow(
      "Only customers have recommendations.",
    );
  });

  it("uses a generic message for an unknown code", async () => {
    failWith("internal_error");
    await expect(fetchRecommendations()).rejects.toThrow(
      DEFAULT_RECOMMENDATIONS_ERROR,
    );
  });

  it("uses a generic message when the error has no readable body", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { context: { json: () => Promise.reject(new Error("no body")) } },
    } as never);
    await expect(fetchRecommendations()).rejects.toThrow(
      DEFAULT_RECOMMENDATIONS_ERROR,
    );
    invoke.mockResolvedValue({
      data: null,
      error: new Error("network"),
    } as never);
    await expect(fetchRecommendations()).rejects.toThrow(
      DEFAULT_RECOMMENDATIONS_ERROR,
    );
  });
});
