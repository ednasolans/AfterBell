
import type { FamilyProfile } from "./types";

export function sortFamilyProfiles(
  profiles: FamilyProfile[],
): FamilyProfile[] {
  return [...profiles].sort((a, b) => {
    const byDate = a.created_at.localeCompare(b.created_at);

    if (byDate !== 0) {
      return byDate;
    }

    return a.id.localeCompare(b.id);
  });
}

export function getActiveFamilyProfile(
  profiles: FamilyProfile[],
  selectedProfileId: string | null,
): FamilyProfile | null {
  const sortedProfiles = sortFamilyProfiles(profiles);

  if (sortedProfiles.length === 0) {
    return null;
  }

  const selectedProfile = sortedProfiles.find(
    (profile) => profile.id === selectedProfileId,
  );

  // If no valid selection exists, use the main profile.
  return selectedProfile ?? sortedProfiles[0];
}

export function getActiveProfileStorageKey(
  userId: string,
): string {
  return `afterbell:active-family-profile:${userId}`;
}
