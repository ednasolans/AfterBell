import { type ReceivedRequestFilters } from "../types";

// Query keys of the enrolment requests
export const enrolmentKeys = {
  all: ["enrolments"] as const,
  mine: () => [...enrolmentKeys.all, "mine"] as const,
  // Requests received by the provider, one list per filter
  received: () => [...enrolmentKeys.all, "received"] as const,
  receivedList: (filters: ReceivedRequestFilters) =>
    [...enrolmentKeys.received(), filters] as const,
  places: () => [...enrolmentKeys.all, "places"] as const,
};

// Family profiles belong to the family-profiles feature: this key starts with
// its root key, so changing a profile there also refreshes this list.
export const enrolmentProfilesKey = ["family-profiles", "enrolment"] as const;
