// Values of activities.status (CHECK constraint). Only published activities
// are visible to customers; new activities start as drafts.
export const ACTIVITY_STATUSES = ["draft", "published"] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  draft: "Draft",
  published: "Published",
};