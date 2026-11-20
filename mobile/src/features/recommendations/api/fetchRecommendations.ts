import { type ActivityRow, toActivity } from "@/lib/activity";
import { supabase } from "@/lib/supabase";

import {
  RECOMMENDATION_STATUSES,
  type RecommendationsPage,
  type RecommendationStatus,
} from "../types";

// The Edge Function accepts at most 40
export const RECOMMENDATIONS_PAGE_SIZE = 20;

export const RECOMMENDATIONS_ERROR_MESSAGES: Record<string, string> = {
  forbidden: "Only customers have recommendations.",
  unauthorized: "Please log in again to see your recommendations.",
};

export const DEFAULT_RECOMMENDATIONS_ERROR =
  "Your recommendations could not be loaded. Please try again.";

interface ItemBody {
  activity: ActivityRow;
  matched_profiles: { id: string; first_name: string }[];
  distance_meters: number | null;
}

function isStatus(value: unknown): value is RecommendationStatus {
  return RECOMMENDATION_STATUSES.some((status) => status === value);
}

// Read mapper: the body of the Edge Function -> app types. A body the app does
// not understand is an error, never an empty list without explanation.
export function toRecommendationsPage(data: unknown): RecommendationsPage {
  const body = (data ?? {}) as {
    status?: unknown;
    activities?: ItemBody[];
    pagination?: { has_more?: unknown };
  };
  if (!isStatus(body.status) || !Array.isArray(body.activities)) {
    throw new Error(DEFAULT_RECOMMENDATIONS_ERROR);
  }
  return {
    status: body.status,
    recommendations: body.activities.map((item) => ({
      activity: toActivity(item.activity),
      matchedProfiles: item.matched_profiles.map((profile) => ({
        id: profile.id,
        firstName: profile.first_name,
      })),
      distanceMeters: item.distance_meters,
    })),
    hasMore: body.pagination?.has_more === true,
  };
}

// The function answers { error: { code, message } }; Supabase keeps the
// response in error.context
async function readErrorCode(error: unknown): Promise<string | undefined> {
  const context = (error as { context?: { json?: () => Promise<unknown> } })
    .context;
  if (typeof context?.json !== "function") {
    return undefined;
  }
  try {
    const body = (await context.json()) as { error?: { code?: string } };
    return body.error?.code;
  } catch {
    return undefined;
  }
}

// One page of the recommendations of the logged-in customer. Page 0 is the
// first one. The function only knows the family of the session, so there is
// no way to ask for another customer's recommendations.
export async function fetchRecommendations(
  page = 0,
): Promise<RecommendationsPage> {
  const { data, error } = await supabase.functions.invoke("recommendations", {
    body: {
      limit: RECOMMENDATIONS_PAGE_SIZE,
      offset: page * RECOMMENDATIONS_PAGE_SIZE,
    },
  });
  if (error) {
    const code = await readErrorCode(error);
    throw new Error(
      (code && RECOMMENDATIONS_ERROR_MESSAGES[code]) ??
        DEFAULT_RECOMMENDATIONS_ERROR,
    );
  }
  return toRecommendationsPage(data);
}
