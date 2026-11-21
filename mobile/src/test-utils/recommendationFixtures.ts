import { type RecommendationActionHandlers } from "@/features/recommendations/components/RecommendationsStatus";
import {
  type Recommendation,
  type RecommendationsPage,
} from "@/features/recommendations/types";

import { ACTIVITY } from "./activityFixtures";

// Shared by the tests of the recommendations

export function makeRecommendation(
  overrides: Partial<Recommendation> = {},
): Recommendation {
  return {
    activity: { ...ACTIVITY, status: "published" },
    matchedProfiles: [{ id: "profile-1", firstName: "Marc" }],
    providerName: "Pool club",
    distanceMeters: 120,
    ...overrides,
  };
}

export function makePage(
  overrides: Partial<RecommendationsPage> = {},
): RecommendationsPage {
  return {
    status: "OK",
    recommendations: [makeRecommendation()],
    hasMore: false,
    ...overrides,
  };
}

// One mock per action of the empty states
export function makeRecommendationActions(): RecommendationActionHandlers {
  return {
    setTown: jest.fn(),
    addProfile: jest.fn(),
    completeProfile: jest.fn(),
    searchActivities: jest.fn(),
    seeAllActivities: jest.fn(),
  };
}
