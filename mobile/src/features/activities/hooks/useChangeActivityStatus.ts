import { useMutation, useQueryClient } from "@tanstack/react-query";

import { changeActivityStatus } from "../api/changeActivityStatus";
import { activityKeys } from "./activityKeys";

export function useChangeActivityStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changeActivityStatus,
    // Lists, details and publication issues are now out of date
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: activityKeys.all }),
  });
}
