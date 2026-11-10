// Query keys of the enrolment requests
export const enrolmentKeys = {
  all: ["enrolments"] as const,
  mine: () => [...enrolmentKeys.all, "mine"] as const,
};

// Family profiles belong to the family-profiles feature: this key starts with
// its root key, so changing a profile there also refreshes this list.
export const enrolmentProfilesKey = ["family-profiles", "enrolment"] as const;
