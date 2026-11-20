import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { recommendationKeys } from "@/lib/recommendationKeys";

import { fetchFamilyCity, saveFamilyLocation } from "../api/familyLocation";
import { familyProfileKeys } from "./useFamilyProfiles";

// Starts with the root key of the feature, so refreshing the family profiles
// also refreshes the town
export const familyLocationKey = [
  ...familyProfileKeys.all,
  "location",
] as const;

export function useFamilyCity() {
  return useQuery({
    queryKey: familyLocationKey,
    queryFn: fetchFamilyCity,
  });
}

export function useSaveFamilyLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveFamilyLocation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: familyLocationKey });
      // The recommendations are the activities of the family's town
      void queryClient.invalidateQueries({ queryKey: recommendationKeys.all });
    },
  });
}
