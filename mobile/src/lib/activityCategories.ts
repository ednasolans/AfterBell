export const ACTIVITY_CATEGORIES = [
  "football",
  "basketball",
  "tennis",
  "swimming",
  "dance",
  "drama",
  "music",
  "language",
  "art",
  "tutoring",
  "other",
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  football: "Football",
  basketball: "Basketball",
  tennis: "Tennis",
  swimming: "Swimming",
  dance: "Dance",
  drama: "Drama",
  music: "Music",
  language: "Language",
  art: "Art",
  tutoring: "Tutoring",
  other: "Other",
};
