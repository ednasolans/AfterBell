import { type Tables } from "@/lib/database.types";

import { type ProfileStatus, type ProviderProfile } from "../types";

// Row of provider_profiles → app type.
// The CHECK constraint guarantees that status is one of PROFILE_STATUSES.
export function toProviderProfile(
  row: Tables<"provider_profiles">,
): ProviderProfile {
  return {
    headline: row.headline,
    description: row.description,
    status: row.status as ProfileStatus,
    generatedAt: row.generated_at,
    approvedAt: row.approved_at,
  };
}
