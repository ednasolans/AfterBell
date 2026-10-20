// Converts the text typed by the user into a whole number, or null if it is
// empty or not a whole number ("12" -> 12; "", "1.5", "12a" -> null)
export function parseInteger(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  return Number(trimmed);
}
