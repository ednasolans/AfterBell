import { useMutation, useQueryClient } from "@tanstack/react-query";

import { answerEnrolmentRequest } from "../api/answerEnrolmentRequest";
import {
  type ActivityPlaces,
  type EnrolmentAnswer,
  type ReceivedEnrolmentRequest,
} from "../types";
import { enrolmentKeys } from "./enrolmentKeys";

export type AnswerInput = {
  requestId: string;
  activityId: string;
  answer: EnrolmentAnswer;
};

// Accepts or rejects a request. When the server answers, the request and the
// counter change at once in every list, and then they are read again in the
// background, without a loading screen.
export function useAnswerEnrolmentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, answer }: AnswerInput) =>
      answerEnrolmentRequest({ requestId, answer }),

    onSuccess: (_data, { requestId, activityId, answer }) => {
      const status = answer === "accept" ? "accepted" : "rejected";
      queryClient.setQueriesData<ReceivedEnrolmentRequest[]>(
        { queryKey: enrolmentKeys.received() },
        (requests) =>
          requests?.map((request) =>
            request.id === requestId ? { ...request, status } : request,
          ),
      );
      if (answer === "accept") {
        queryClient.setQueryData<ActivityPlaces[]>(
          enrolmentKeys.places(),
          (places) =>
            places?.map((item) =>
              item.activityId === activityId
                ? {
                    ...item,
                    takenPlaces: item.takenPlaces + 1,
                    availablePlaces:
                      item.availablePlaces === null
                        ? null
                        : Math.max(0, item.availablePlaces - 1),
                  }
                : item,
            ),
        );
      }
    },

    // Also after an error: someone may have taken the last place
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: enrolmentKeys.received(),
      });
      void queryClient.invalidateQueries({ queryKey: enrolmentKeys.places() });
    },
  });
}
