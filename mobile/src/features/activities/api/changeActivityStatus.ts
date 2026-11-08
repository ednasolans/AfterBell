import { type ActivityStatus } from "@/lib/activityStatus";
import { supabase } from "@/lib/supabase";

// Publishes ("published") or unpublishes ("draft") one of the provider's
// activities. Unpublishing never deletes the activity or its data.
// The database rejects publishing when something is missing: use
// fetchPublicationIssues to know what.
export async function changeActivityStatus({
  id,
  status,
}: {
  id: string;
  status: ActivityStatus;
}): Promise<void> {
  const { data, error } = await supabase
    .from("activities")
    .update({ status })
    .eq("id", id)
    .select("id");
  if (error) {
    throw new Error(error.message);
  }
  // RLS does not fail when the row belongs to someone else: it updates 0 rows
  if (data.length === 0) {
    throw new Error("The activity does not exist or you cannot change it");
  }
}
