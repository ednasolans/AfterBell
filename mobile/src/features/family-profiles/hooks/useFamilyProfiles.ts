
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

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

export function useCreateFamilyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFamilyProfile,

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: familyProfileKeys.all,
      });
    },
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

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: familyProfileKeys.all,
      });
    },
  });
}

export function useDeleteFamilyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFamilyProfile,

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: familyProfileKeys.all,
      });
    },
  });
}
