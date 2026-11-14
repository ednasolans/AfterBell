import { supabase } from "@/lib/supabase";

import {
  type ReceivedEnrolmentRequest,
  type ReceivedRequestFilters,
} from "../types";
import { toReceivedEnrolmentRequest } from "./toReceivedEnrolmentRequest";

// The most the function returns in one page
export const RECEIVED_REQUESTS_LIMIT = 100;

// The requests for the activities of the logged-in provider, pending first
export async function fetchReceivedEnrolmentRequests({
  activityId,
  status,
}: ReceivedRequestFilters): Promise<ReceivedEnrolmentRequest[]> {
  const { data, error } = await supabase.rpc("provider_enrolment_requests", {
    p_activity_id: activityId ?? undefined,
    p_status: status ?? undefined,
    p_limit: RECEIVED_REQUESTS_LIMIT,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data.map(toReceivedEnrolmentRequest);
}
