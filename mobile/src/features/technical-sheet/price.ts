// Digits, optionally followed by a decimal separator (dot or comma) and up to 2 decimals
const PRICE_PATTERN = /^-?\d+([.,]\d{1,2})?$/;

// Converts the text typed by the user into a price, or null if it is empty or not a number
export function parsePrice(text: string): number | null {
  const trimmed = text.trim();
  if (!PRICE_PATTERN.test(trimmed)) {
    return null;
  }
  return Number(trimmed.replace(',', '.'));
}