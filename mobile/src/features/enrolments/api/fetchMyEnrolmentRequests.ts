import { supabase } from "@/lib/supabase";

import { type EnrolmentRequest } from "../types";
import { toEnrolmentRequest } from "./toEnrolmentRequest";

// The most the function returns at once. A family rarely has more requests.
export const MY_REQUESTS_LIMIT = 100;

// The requests of the logged-in family, newest first
export async function fetchMyEnrolmentRequests(): Promise<EnrolmentRequest[]> {
  const { data, error } = await supabase.rpc("my_enrolment_requests", {
    p_limit: MY_REQUESTS_LIMIT,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data.map(toEnrolmentRequest);
}
