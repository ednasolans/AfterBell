// Optional text is stored as NULL when it is empty or only has spaces, never as ''
export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
