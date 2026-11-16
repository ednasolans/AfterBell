import { renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { fetchSearchSummary } from "../api/fetchSearchSummary";
import { type SearchSummaryFilters, type SearchSummaryResult } from "../types";
import { searchSummaryKeys } from "./searchSummaryKeys";
import { useSearchSummary } from "./useSearchSummary";

jest.mock("../api/fetchSearchSummary", () => ({
  fetchSearchSummary: jest.fn(),
}));

const SWIMMING: SearchSummaryFilters = {
  query: "swimming",
  category: null,
  city: "Lleida",
  priceMin: null,
  priceMax: null,
};
const MUSIC: SearchSummaryFilters = { ...SWIMMING, query: "music" };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("searchSummaryKeys", () => {
  it("gives the same key to the same search written differently", () => {
    expect(
      searchSummaryKeys.forFilters({ ...SWIMMING, query: "  Swimming " }),
    ).toEqual(searchSummaryKeys.forFilters(SWIMMING));
    expect(
      searchSummaryKeys.forFilters({ ...SWIMMING, city: " " })[1].city,
    ).toBeNull();
  });

  it("gives another key to another search", () => {
    expect(searchSummaryKeys.forFilters(MUSIC)).not.toEqual(
      searchSummaryKeys.forFilters(SWIMMING),
    );
  });
});

describe("useSearchSummary", () => {
  it("does not ask for a summary while it is disabled", async () => {
    const { result } = await renderHook(
      () => useSearchSummary(SWIMMING, false),
      {
        wrapper: createQueryClientWrapper(createTestQueryClient()),
      },
    );
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchSearchSummary).not.toHaveBeenCalled();
  });

  it("returns the summary of the search", async () => {
    jest
      .mocked(fetchSearchSummary)
      .mockResolvedValue({ status: "READY", summary: "Two activities." });
    const { result } = await renderHook(
      () => useSearchSummary(SWIMMING, true),
      {
        wrapper: createQueryClientWrapper(createTestQueryClient()),
      },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      status: "READY",
      summary: "Two activities.",
    });
    expect(fetchSearchSummary).toHaveBeenCalledWith(
      SWIMMING,
      expect.anything(),
    );
  });

  it("never shows a late answer for the previous search", async () => {
    const answers = new Map<
      string | null,
      (value: SearchSummaryResult) => void
    >();
    jest.mocked(fetchSearchSummary).mockImplementation(
      (filters) =>
        new Promise((resolve) => {
          answers.set(filters.query, resolve);
        }),
    );
    const { result, rerender } = await renderHook(
      ({ filters }: { filters: SearchSummaryFilters }) =>
        useSearchSummary(filters, true),
      {
        initialProps: { filters: SWIMMING },
        wrapper: createQueryClientWrapper(createTestQueryClient()),
      },
    );
    await rerender({ filters: MUSIC });
    await waitFor(() => expect(answers.size).toBe(2));

    answers.get("music")?.({ status: "READY", summary: "Music summary." });
    answers.get("swimming")?.({
      status: "READY",
      summary: "Swimming summary.",
    });

    await waitFor(() =>
      expect(result.current.data).toEqual({
        status: "READY",
        summary: "Music summary.",
      }),
    );
  });
});
