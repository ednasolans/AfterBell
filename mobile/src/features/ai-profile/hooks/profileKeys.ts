// Query keys of the AI profile feature. Invalidating `profileKeys.all`
// refreshes the provider's profile after generating, saving or approving.
export const profileKeys = {
  all: ["provider-profile"] as const,
  mine: () => [...profileKeys.all, "mine"] as const,
};
