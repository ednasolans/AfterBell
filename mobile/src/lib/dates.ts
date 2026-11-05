// Dates are stored as "YYYY-MM-DD", without a time or a time zone. Do not use
// toISOString(): it converts to UTC, so in Spain a date picked at midnight
// would be saved as the day before.
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// "5 Jan 2027", in the language of the device unless a locale is given
export function formatDate(isoDate: string, locale?: string): string {
  return fromIsoDate(isoDate).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
