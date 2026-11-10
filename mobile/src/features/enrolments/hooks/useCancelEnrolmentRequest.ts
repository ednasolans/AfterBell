import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cancelEnrolmentRequest } from "../api/cancelEnrolmentRequest";
import { enrolmentKeys } from "./enrolmentKeys";

export function useCancelEnrolmentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelEnrolmentRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: enrolmentKeys.all });
    },
  });
}
