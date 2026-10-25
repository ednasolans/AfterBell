import { type ActivityType } from "@/features/activities/types";
import { AGE_RANGE_LABELS, type AgeRange } from "@/lib/ages";

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  whole_year: "Whole year",
  event: "Event",
};

export function formatAgeRanges(ranges: AgeRange[]): string {
  return ranges.map((range) => AGE_RANGE_LABELS[range]).join(", ");
}