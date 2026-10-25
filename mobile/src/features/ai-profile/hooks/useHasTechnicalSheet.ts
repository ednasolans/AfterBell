import { useQuery } from "@tanstack/react-query";

import { hasTechnicalSheet } from "../api/hasTechnicalSheet";

// Own root key: the technical sheet does not belong to this feature
export const technicalSheetExistsKey = ["technical-sheet", "exists"] as const;

export function useHasTechnicalSheet() {
  return useQuery({
    queryKey: technicalSheetExistsKey,
    queryFn: hasTechnicalSheet,
  });
}
