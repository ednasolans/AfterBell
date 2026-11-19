export const AGE_RANGES = [
  "0-3",
  "4-6",
  "7-9",
  "10-12",
  "13-15",
  "16-17",
  "adult",
] as const;

export type AgeRange = (typeof AGE_RANGES)[number];

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  "0-3": "0–3 years",
  "4-6": "4–6 years",
  "7-9": "7–9 years",
  "10-12": "10–12 years",
  "13-15": "13–15 years",
  "16-17": "16–17 years",
  adult: "Adults",
};

export const ADULT_MIN_AGE = 18;

// Ages in years covered by a range; adults have no maximum
export type AgeBounds = { ageMin: number; ageMax: number | null };

export const AGE_RANGE_BOUNDS: Record<AgeRange, AgeBounds> = {
  "0-3": { ageMin: 0, ageMax: 3 },
  "4-6": { ageMin: 4, ageMax: 6 },
  "7-9": { ageMin: 7, ageMax: 9 },
  "10-12": { ageMin: 10, ageMax: 12 },
  "13-15": { ageMin: 13, ageMax: 15 },
  "16-17": { ageMin: 16, ageMax: 17 },
  adult: { ageMin: ADULT_MIN_AGE, ageMax: null },
};

// Whole years on `today` of someone born on `dateOfBirth` (YYYY-MM-DD)
export function ageOn(dateOfBirth: string, today: Date): number {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const hadBirthday =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);
  return today.getFullYear() - year - (hadBirthday ? 0 : 1);
}
