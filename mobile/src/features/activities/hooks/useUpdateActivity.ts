import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateActivity } from "../api/updateActivity";
import { activityKeys } from "./activityKeys";

export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateActivity,
    // The lists and the edited activity are now out of date: refetch them
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: activityKeys.all }),
  });
}
