import { supabase } from "@/lib/supabase";
import { emptyToNull } from "@/lib/text";

import { type EnrolmentRequestForm } from "../types";

export type SendEnrolmentRequestsInput = {
  activityId: string;
  form: EnrolmentRequestForm;
};

// One request per family profile (team decision), sent one after the other.
// If one fails (e.g. the last place was just taken), the ones sent before are
// kept and the error is thrown: the list of requests shows which were sent.
export async function sendEnrolmentRequests({
  activityId,
  form,
}: SendEnrolmentRequestsInput): Promise<void> {
  const message = emptyToNull(form.message) ?? undefined;
  for (const profileId of form.profileIds) {
    const { error } = await supabase.rpc("send_enrolment_request", {
      p_activity_id: activityId,
      p_family_profile_id: profileId,
      p_message: message,
    });
    if (error) {
      throw new Error(error.message);
    }
  }
}
