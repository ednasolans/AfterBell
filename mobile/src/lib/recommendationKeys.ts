export const recommendationKeys = {
  all: ["recommendations"] as const,
  // The order depends on the profile the customer is exploring for
  forProfile: (profileId: string | null) =>
    [...recommendationKeys.all, profileId] as const,
};
