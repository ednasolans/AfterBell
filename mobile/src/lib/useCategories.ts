import { useQuery } from "@tanstack/react-query";

import { fetchCategories } from "@/lib/categories";

// Own root key: the catalogue does not belong to any feature
export const categoriesKey = ["categories"] as const;

// The catalogue only changes with a migration: keep it for one hour
const CATEGORIES_STALE_TIME_MS = 60 * 60 * 1000;

export function useCategories() {
  return useQuery({
    queryKey: categoriesKey,
    queryFn: fetchCategories,
    staleTime: CATEGORIES_STALE_TIME_MS,
  });
}
