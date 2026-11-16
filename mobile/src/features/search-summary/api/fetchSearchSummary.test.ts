import { supabase } from "@/lib/supabase";

import { type SearchSummaryFilters } from "../types";
import {
  fetchSearchSummary,
  toSearchSummaryResult,
} from "./fetchSearchSummary";

jest.mock("@/lib/supabase", () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

const FILTERS: SearchSummaryFilters = {
  query: "swimming",
  category: null,
  city: "Lleida",
  priceMin: null,
  priceMax: 50,
};

function invokeReturns(result: { data: unknown; error: unknown }) {
  jest.mocked(supabase.functions.invoke).mockResolvedValue(result as never);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("fetchSearchSummary", () => {
  it("sends the filters and the signal to summarize-search", async () => {
    invokeReturns({
      data: { status: "READY", summary: "Two activities." },
      error: null,
    });
    const signal = new AbortController().signal;
    await expect(fetchSearchSummary(FILTERS, signal)).resolves.toEqual({
      status: "READY",
      summary: "Two activities.",
    });
    expect(supabase.functions.invoke).toHaveBeenCalledWith("summarize-search", {
      body: FILTERS,
      signal,
    });
  });

  it("throws a clear error when the function fails", async () => {
    invokeReturns({ data: null, error: new Error("401") });
    await expect(fetchSearchSummary(FILTERS)).rejects.toThrow(
      "The search summary could not be loaded.",
    );
  });
});

describe("toSearchSummaryResult", () => {
  it("trims the summary", () => {
    expect(
      toSearchSummaryResult({ status: "READY", summary: " Text. " }),
    ).toEqual({
      status: "READY",
      summary: "Text.",
    });
  });

  it.each(["NO_RESULTS", "UNAVAILABLE", "RATE_LIMITED"] as const)(
    "keeps the %s status without a summary",
    (status) => {
      expect(toSearchSummaryResult({ status, summary: "ignored" })).toEqual({
        status,
      });
    },
  );

  it.each([
    ["an empty summary", { status: "READY", summary: "  " }],
    ["a summary that is not text", { status: "READY", summary: 5 }],
    ["an unknown status", { status: "SOMETHING_NEW" }],
    ["no body", null],
  ])("treats %s as UNAVAILABLE", (_name, data) => {
    expect(toSearchSummaryResult(data)).toEqual({ status: "UNAVAILABLE" });
  });
});
