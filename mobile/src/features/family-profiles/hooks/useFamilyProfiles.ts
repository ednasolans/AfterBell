
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { recommendationKeys } from "@/lib/recommendationKeys";

import {
  createFamilyProfile,
  deleteFamilyProfile,
  fetchFamilyProfile,
  fetchFamilyProfiles,
  updateFamilyProfile,
} from "../api/familyProfiles";

import type { FamilyProfileFormValues } from "../types";

export const familyProfileKeys = {
  all: ["family-profiles"] as const,

  list: (userId: string) =>
    ["family-profiles", userId, "list"] as const,

  detail: (userId: string, profileId: string) =>
    ["family-profiles", userId, "detail", profileId] as const,
};

export function useFamilyProfiles(userId: string) {
  return useQuery({
    queryKey: familyProfileKeys.list(userId),
    queryFn: fetchFamilyProfiles,
    enabled: Boolean(userId),
  });
}

export function useFamilyProfile(
  userId: string,
  profileId?: string,
) {
  return useQuery({
    queryKey: familyProfileKeys.detail(
      userId,
      profileId ?? "",
    ),
    queryFn: () => fetchFamilyProfile(profileId!),
    enabled: Boolean(userId && profileId),
  });
}

// The recommendations depend on the profiles (age and interests), so they are
// recalculated too
function invalidateFamilyProfiles(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: familyProfileKeys.all });
  void queryClient.invalidateQueries({ queryKey: recommendationKeys.all });
}

export function useCreateFamilyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFamilyProfile,

    onSuccess: () => invalidateFamilyProfiles(queryClient),
  });
}

export function useUpdateFamilyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: FamilyProfileFormValues;
    }) => updateFamilyProfile(id, values),

    onSuccess: () => invalidateFamilyProfiles(queryClient),
  });
}

export function useDeleteFamilyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFamilyProfile,

    onSuccess: () => invalidateFamilyProfiles(queryClient),
  });
}
