// Query keys of the activities feature, defined once so every hook uses the same ones.
// Every key starts with "activities", so invalidating `activityKeys.all`
// refreshes every list and every single activity at once.
export const activityKeys = {
  all: ["activities"] as const,
  mine: () => [...activityKeys.all, "mine"] as const,
  detail: (id: string) => [...activityKeys.all, "detail", id] as const,
};
