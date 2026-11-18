import {
  AGE_RANGE_BOUNDS,
  AGE_RANGES,
  type AgeBounds,
  type AgeRange,
} from "@/lib/ages";
import { formatDate } from "@/lib/dates";
import { formatPrice as formatPriceValue } from "@/lib/price";
import { type TimeSlot, WEEK_DAYS, type WeekDay } from "@/lib/schedule";

export function formatAgeRanges(ranges: AgeRange[]): string {
  return ranges.join(", ");
}

export function formatAgeRange(minAge: number, maxAge: number): string {
  return `${minAge}–${maxAge} years`;
}

export function formatActivityPrice(
  price: number,
  period: Parameters<typeof formatPriceValue>[1],
): string {
  return formatPriceValue(price, period);
}

export function formatPrice(price: number): string {
  return price === 0 ? "Free" : `${price} €`;
}

export function formatDateRange(
  startDate: string | null,
  endDate: string | null,
): string | null {
  if (startDate && endDate) {
    return `${formatDate(startDate)} – ${formatDate(endDate)}`;
  }
  if (startDate) return `From ${formatDate(startDate)}`;
  if (endDate) return `Until ${formatDate(endDate)}`;
  return null;
}

// "Ages 7–12", "Ages 4–6, 13–15", "Ages 16+", "Adults" or "All ages".
// Ranges that follow each other are joined. The database also allows
// 'all_publics' (every age), which the app does not list.
export function formatAgeSummary(ranges: readonly string[]): string | null {
  if (ranges.includes("all_publics")) {
    return "All ages";
  }
  const bounds = AGE_RANGES.filter((range) => ranges.includes(range)).map(
    (range) => AGE_RANGE_BOUNDS[range],
  );
  if (bounds.length === 0) {
    return null;
  }
  if (bounds.length === 1 && bounds[0].ageMax === null) {
    return "Adults";
  }
  const spans: AgeBounds[] = [];
  for (const next of bounds) {
    const last = spans.at(-1);
    if (last && last.ageMax !== null && next.ageMin === last.ageMax + 1) {
      spans[spans.length - 1] = { ageMin: last.ageMin, ageMax: next.ageMax };
    } else {
      spans.push({ ...next });
    }
  }
  const text = spans
    .map(({ ageMin, ageMax }) =>
      ageMax === null ? `${ageMin}+` : `${ageMin}–${ageMax}`,
    )
    .join(", ");
  return `Ages ${text}`;
}

const SHORT_DAY_LABELS: Record<WeekDay, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

// "Mon & Wed, 17:00": the days in week order, and the start time when every
// slot starts at the same time
export function formatScheduleSummary(
  schedule: readonly TimeSlot[],
): string | null {
  if (schedule.length === 0) {
    return null;
  }
  const days = WEEK_DAYS.filter((day) =>
    schedule.some((slot) => slot.day === day),
  ).map((day) => SHORT_DAY_LABELS[day]);
  const dayText =
    days.length === 1
      ? days[0]
      : `${days.slice(0, -1).join(", ")} & ${days.at(-1)}`;
  const startTimes = new Set(schedule.map((slot) => slot.startTime));
  return startTimes.size === 1
    ? `${dayText}, ${schedule[0].startTime}`
    : dayText;
}
