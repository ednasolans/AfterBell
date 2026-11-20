import { type AgeBounds } from "@/lib/ages";

import { useActiveProfile } from "../context/ActiveProfileProvider";
import { profileAgeBounds } from "../profileAge";

// The ages of the active profile, to look for activities for them. null
// while there is no active profile or it has no age.
export function useActiveProfileAges(): AgeBounds | null {
  const { activeProfile } = useActiveProfile();
  return activeProfile ? profileAgeBounds(activeProfile, new Date()) : null;
}
