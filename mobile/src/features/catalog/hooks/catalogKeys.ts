// Query keys of the catalog (what customers see), defined once so every hook uses the same ones.
export const catalogKeys = {
  all: ["catalog"] as const,
  list: () => [...catalogKeys.all, "list"] as const,
  detail: (id: string) => [...catalogKeys.all, "detail", id] as const,
};
