import { type AgeBounds, ageOn } from "@/lib/ages";

import { type FamilyProfile } from "./types";

// The age always comes from the date of birth: it is never stored
type ProfileBirth = Pick<FamilyProfile, "date_of_birth">;

// The ages to look for activities for a profile: its exact age today
export function profileAgeBounds(
  profile: ProfileBirth,
  today: Date,
): AgeBounds {
  const age = ageOn(profile.date_of_birth, today);
  return { ageMin: age, ageMax: age };
}

// "Age 8"
export function profileAgeLabel(profile: ProfileBirth, today: Date): string {
  return `Age ${ageOn(profile.date_of_birth, today)}`;
}
