import {
  AGE_RANGE_BOUNDS,
  AGE_RANGE_LABELS,
  AGE_RANGES,
  type AgeBounds,
  type AgeRange,
  ageOn,
} from "@/lib/ages";

import { type FamilyProfile } from "./types";

type ProfileAges = Pick<FamilyProfile, "date_of_birth" | "age_range">;

function toAgeRange(value: string | null): AgeRange | null {
  return AGE_RANGES.find((range) => range === value) ?? null;
}

// The ages to look for activities for a profile: the exact age when the date
// of birth is known, otherwise its age range. null when it has neither.
export function profileAgeBounds(
  profile: ProfileAges,
  today: Date,
): AgeBounds | null {
  if (profile.date_of_birth) {
    const age = ageOn(profile.date_of_birth, today);
    return { ageMin: age, ageMax: age };
  }
  const range = toAgeRange(profile.age_range);
  return range ? AGE_RANGE_BOUNDS[range] : null;
}

// "Age 8", "7–9 years", or null when the profile has no age
export function profileAgeLabel(
  profile: ProfileAges,
  today: Date,
): string | null {
  if (profile.date_of_birth) {
    return `Age ${ageOn(profile.date_of_birth, today)}`;
  }
  const range = toAgeRange(profile.age_range);
  return range ? AGE_RANGE_LABELS[range] : null;
}
