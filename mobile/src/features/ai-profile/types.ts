// Profile statuses, matching the CHECK constraint of provider_profiles.status
export const PROFILE_STATUSES = ["draft", "approved"] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const PROFILE_STATUS_LABELS: Record<ProfileStatus, string> = {
  draft: "Draft",
  approved: "Published",
};

// AI-generated public profile of the logged-in provider
export type ProviderProfile = {
  headline: string;
  description: string;
  status: ProfileStatus;
  generatedAt: string;
  approvedAt: string | null;
};

// Values the provider can edit before publishing
export type ProfileForm = {
  headline: string;
  description: string;
};
