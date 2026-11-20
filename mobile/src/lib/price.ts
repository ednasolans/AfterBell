export const PRICE_PERIODS = [
  "per_hour",
  "per_day",
  "per_week",
  "per_month",
  "per_term",
  "per_year",
] as const;

export type PricePeriod = (typeof PRICE_PERIODS)[number];

export const PRICE_PERIOD_LABELS: Record<PricePeriod, string> = {
  per_hour: "Per hour",
  per_day: "Per day",
  per_week: "Per week",
  per_month: "Per month",
  per_term: "Per term",
  per_year: "Per year",
};

// Digits, optionally followed by a decimal separator (dot or comma) and up to 2 decimals
const PRICE_PATTERN = /^-?\d+([.,]\d{1,2})?$/;

// Converts the text typed by the user into a price, or null if it is empty or not a number
export function parsePrice(text: string): number | null {
  const trimmed = text.trim();
  if (!PRICE_PATTERN.test(trimmed)) {
    return null;
  }
  return Number(trimmed.replace(",", "."));
}

// "30", "9,50": no decimals when they are zero
export function formatAmount(price: number): string {
  return Number.isInteger(price)
    ? String(price)
    : price.toFixed(2).replace(".", ",");
}

// "30 € per month"
export function formatPrice(price: number, period: PricePeriod): string {
  return `${formatAmount(price)} € ${PRICE_PERIOD_LABELS[period].toLowerCase()}`;
}
