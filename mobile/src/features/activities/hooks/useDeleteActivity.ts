import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteActivity } from "../api/deleteActivity";
import { activityKeys } from "./activityKeys";

export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteActivity,
    // The lists of activities are now out of date: refetch them
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: activityKeys.all }),
  });
}
