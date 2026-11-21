import { type Activity } from "@/lib/activity";

// OK: a page of recommendations. NO_MATCHES: the data is complete but nothing
// fits. The others say which data the customer has to add (city, profiles,
// or the date of birth and interests of the profiles).
export const RECOMMENDATION_STATUSES = [
  "OK",
  "NO_MATCHES",
  "NO_CITY",
  "NO_PROFILES",
  "INCOMPLETE_PROFILES",
] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

// The family profile that makes an activity a good suggestion
export interface MatchedProfile {
  id: string;
  firstName: string;
}

export interface Recommendation {
  activity: Activity;
  matchedProfiles: MatchedProfile[];
  // From the technical sheet; null when the provider has none
  providerName: string | null;
  // From the (blurred) point of the family; null when the activity has none
  distanceMeters: number | null;
}

export interface RecommendationsPage {
  status: RecommendationStatus;
  recommendations: Recommendation[];
  hasMore: boolean;
}
