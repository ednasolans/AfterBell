import { useMutation, useQueryClient } from "@tanstack/react-query";

import { approveProfile } from "../api/updateMyProfile";
import { profileKeys } from "./profileKeys";

export function useApproveProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => approveProfile(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: profileKeys.all }),
  });
}
