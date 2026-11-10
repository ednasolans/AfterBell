import { supabase } from "@/lib/supabase";

// Cancels a pending or accepted request of the logged-in family. Cancelling an
// accepted request frees its place.
export async function cancelEnrolmentRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_enrolment_request", {
    p_request_id: requestId,
  });
  if (error) {
    throw new Error(error.message);
  }
}
