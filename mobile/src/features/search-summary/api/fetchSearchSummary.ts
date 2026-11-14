import { supabase } from "@/lib/supabase";

import { type SearchSummaryFilters, type SearchSummaryResult } from "../types";

const HIDDEN_STATUSES = ["NO_RESULTS", "UNAVAILABLE", "RATE_LIMITED"] as const;

// Anything the app does not understand is treated as UNAVAILABLE (hidden)
export function toSearchSummaryResult(data: unknown): SearchSummaryResult {
  const body = (data ?? {}) as { status?: unknown; summary?: unknown };
  if (body.status === "READY" && typeof body.summary === "string") {
    const summary = body.summary.trim();
    if (summary !== "") {
      return { status: "READY", summary };
    }
  }
  const hidden = HIDDEN_STATUSES.find((status) => status === body.status);
  return { status: hidden ?? "UNAVAILABLE" };
}

// Asks the Edge Function for an AI summary of the search. The LLM key never
// reaches the app. The signal cancels the request when the search changes.
export async function fetchSearchSummary(
  filters: SearchSummaryFilters,
  signal?: AbortSignal,
): Promise<SearchSummaryResult> {
  const { data, error } = await supabase.functions.invoke("summarize-search", {
    body: filters,
    signal,
  });
  if (error) {
    throw new Error("The search summary could not be loaded.");
  }
  return toSearchSummaryResult(data);
}
