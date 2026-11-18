import { type Activity } from "@/lib/activity";
import { type AgeRange } from "@/lib/ages";
import { toIsoDate } from "@/lib/dates";
import { formatPrice as formatPriceValue } from "@/lib/price";

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

export { formatDateRange } from "@/lib/dates";

// An activity is still on during its last day. ISO dates compare as text.
export function isFinished(
  { endDate }: Pick<Activity, "endDate">,
  today: string = toIsoDate(new Date()),
): boolean {
  return endDate !== null && endDate < today;
}
