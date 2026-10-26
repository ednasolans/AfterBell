export function formatAgeRange(minAge: number, maxAge: number): string {
  return `${minAge}–${maxAge} years`;
}

export function formatPrice(price: number): string {
  return price === 0 ? "Free" : `${price} €`;
}

// Dates come as "YYYY-MM-DD". Null when the activity has no dates.
export function formatDateRange(
  startDate: string | null,
  endDate: string | null,
): string | null {
  if (startDate && endDate) {
    return `${startDate} – ${endDate}`;
  }
  if (startDate) {
    return `From ${startDate}`;
  }
  if (endDate) {
    return `Until ${endDate}`;
  }
  return null;
}