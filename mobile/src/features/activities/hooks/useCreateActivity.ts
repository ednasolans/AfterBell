import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createActivity } from "../api/createActivity";
import { activityKeys } from "./activityKeys";

export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createActivity,
    // The lists of activities are now out of date: refetch them
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: activityKeys.all }),
  });
}
