export const ACTIVITY_TYPES = ["whole_year", "event", "temporary"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  whole_year: "Activity",
  temporary: "Temporary",
  event: "Event",
};
