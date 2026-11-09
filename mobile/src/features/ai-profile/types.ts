// draft: never approved. pending_approval: new text (regenerated or edited)
// waiting for approval while customers keep the approved one. approved: published.
export const PROFILE_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const PROFILE_STATUS_LABELS: Record<ProfileStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Published",
};

// AI-generated public profile of the logged-in provider
export type ProviderProfile = {
  headline: string;
  description: string;
  status: ProfileStatus;
  generatedAt: string;
  approvedAt: string | null;
  approvedHeadline: string | null;
  approvedDescription: string | null;
};

// Values the provider can edit before publishing
export type ProfileForm = {
  headline: string;
  description: string;
};
