import { useMutation, useQueryClient } from "@tanstack/react-query";

import { generateProfile } from "../api/generateProfile";
import { profileKeys } from "./profileKeys";

export function useGenerateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateProfile(),
    // A new draft was saved by the Edge Function: load it
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: profileKeys.all }),
  });
}
