import { useMutation, useQueryClient } from "@tanstack/react-query";

import { discardProfileChanges } from "../api/updateMyProfile";
import { profileKeys } from "./profileKeys";

export function useDiscardProfileChanges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => discardProfileChanges(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: profileKeys.all }),
  });
}
