import { useMutation, useQueryClient } from "@tanstack/react-query";

import { sendEnrolmentRequests } from "../api/sendEnrolmentRequests";
import { enrolmentKeys } from "./enrolmentKeys";

export function useSendEnrolmentRequests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendEnrolmentRequests,
    // onSettled instead of onSuccess: when one profile fails, the ones sent
    // before it are saved, and the list must show them
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: enrolmentKeys.all });
    },
  });
}
