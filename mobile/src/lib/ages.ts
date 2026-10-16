export const AGE_RANGES = [
    "0-3",
    "4-6",
    "7-9",
    "10-12",
    "13-15",
    "16-17",
    "adult"
] as const;

export type AgeRange = (typeof AGE_RANGES)[number];

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  '0-3': '0–3 years',
  '4-6': '4–6 years',
  '7-9': '7–9 years',
  '10-12': '10–12 years',
  '13-15': '13–15 years',
  '16-17': '16–17 years',
  adult: 'Adults',
};