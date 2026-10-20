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

// "30" for whole numbers, "45,50" otherwise (comma as decimal separator, like the input)
function formatAmount(amount: number): string {
  return Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2).replace(".", ",");
}

// "30 € per month", or "30–40 € per month" when the prices are different
export function formatPriceRange(
  min: number,
  max: number,
  period: PricePeriod,
): string {
  const amount =
    min === max
      ? formatAmount(min)
      : `${formatAmount(min)}–${formatAmount(max)}`;
  return `${amount} € ${PRICE_PERIOD_LABELS[period].toLowerCase()}`;
}
