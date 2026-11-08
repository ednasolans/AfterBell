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

// Label of a category for display. Categories added to the database after
// this version of the app have no label yet: "board_games" → "Board games".
export function categoryLabel(name: string): string {
  if (name in ACTIVITY_CATEGORY_LABELS) {
    return ACTIVITY_CATEGORY_LABELS[name as ActivityCategory];
  }
  const words = name.replaceAll("_", " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Options for a category selector, ordered by label. Until the catalogue of
// the database is loaded (or if it fails), it offers the categories this
// version of the app knows: the database still rejects unknown categories.
export function categoryOptions(
  categories: { name: string }[] | undefined,
): { value: string; label: string }[] {
  const names = categories
    ? categories.map((category) => category.name)
    : [...ACTIVITY_CATEGORIES];
  return names
    .map((name) => ({ value: name, label: categoryLabel(name) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
