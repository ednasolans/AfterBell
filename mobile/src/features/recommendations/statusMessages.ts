import { type RecommendationStatus } from "./types";

// Why there are no recommendations; OK always has a page of them
export type EmptyRecommendationStatus = Exclude<RecommendationStatus, "OK">;

// What the customer can do about it. The screen decides where each one leads.
export type RecommendationAction =
  | "setTown"
  | "addProfile"
  | "completeProfile"
  | "searchActivities"
  | "seeAllActivities";

export const RECOMMENDATION_ACTION_LABELS: Record<
  RecommendationAction,
  string
> = {
  setTown: "Set your town",
  addProfile: "Add a profile",
  completeProfile: "Add interests",
  searchActivities: "Search activities",
  seeAllActivities: "See all activities",
};

// One message per status of the endpoint, never guessed by the app
export const EMPTY_RECOMMENDATIONS: Record<
  EmptyRecommendationStatus,
  { message: string; actions: readonly RecommendationAction[] }
> = {
  NO_CITY: {
    message: "Set your town to see activities near you.",
    actions: ["setTown"],
  },
  NO_PROFILES: {
    message: "Add a family profile to get activities for their age.",
    actions: ["addProfile"],
  },
  INCOMPLETE_PROFILES: {
    message: "Add interests to a profile to get suggestions.",
    actions: ["completeProfile"],
  },
  NO_MATCHES: {
    message: "No activities fit your family in your town yet.",
    actions: ["searchActivities", "seeAllActivities"],
  },
};
