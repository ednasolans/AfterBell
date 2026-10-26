import { useMutation, useQueryClient } from "@tanstack/react-query";

import { saveProfile } from "../api/updateMyProfile";
import { profileKeys } from "./profileKeys";

export function useSaveProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveProfile,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: profileKeys.all }),
  });
}
