// Query keys of the activities feature, defined once so every hook uses the same ones.
// Invalidating `activityKeys.all` refreshes every list of activities at once.
export const activityKeys = {
  all: ["activities"] as const,
};
