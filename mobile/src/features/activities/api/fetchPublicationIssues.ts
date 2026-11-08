import { supabase } from "@/lib/supabase";

import { type PublicationIssue } from "../types";

// Everything that is still missing to publish one of the provider's
// activities. An empty list means it can be published.
export async function fetchPublicationIssues(
  activityId: string,
): Promise<PublicationIssue[]> {
  const { data, error } = await supabase.rpc("activity_publication_issues", {
    p_activity_id: activityId,
  });
  if (error) {
    throw new Error(error.message);
  }
  // The function returns NULL for activities that are not the caller's
  if (data === null) {
    throw new Error("The activity does not exist or you cannot publish it");
  }
  // The database function only returns these codes
  return data as PublicationIssue[];
}
