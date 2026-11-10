import { supabase } from "@/lib/supabase";

// Removes an activity from the favourites of the logged-in customer. RLS only
// lets them delete their own rows; removing one that is not saved does nothing.
export async function removeFavourite(activityId: string): Promise<void> {
  const { error } = await supabase
    .from("favourites")
    .delete()
    .eq("activity_id", activityId);
  if (error) {
    throw new Error(error.message);
  }
}
