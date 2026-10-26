import { type AgeRange } from "@/lib/ages";
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

export function formatDateRange(
  startDate: string | null,
  endDate: string | null,
): string | null {
  if (startDate && endDate) return `${startDate} – ${endDate}`;
  if (startDate) return `From ${startDate}`;
  if (endDate) return `Until ${endDate}`;
  return null;
}
