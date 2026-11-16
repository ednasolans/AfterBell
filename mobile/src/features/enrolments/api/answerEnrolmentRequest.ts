import { supabase } from "@/lib/supabase";

import { type EnrolmentAnswer } from "../types";

// Accepts or rejects a pending request for one of the provider's activities.
// Accepting fails if the last place has just been taken.
export async function answerEnrolmentRequest({
  requestId,
  answer,
}: {
  requestId: string;
  answer: EnrolmentAnswer;
}): Promise<void> {
  const { error } = await supabase.rpc(
    answer === "accept"
      ? "accept_enrolment_request"
      : "reject_enrolment_request",
    { p_request_id: requestId },
  );
  if (error) {
    throw new Error(error.message);
  }
}
