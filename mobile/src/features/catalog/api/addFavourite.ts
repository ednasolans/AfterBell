import { supabase } from "@/lib/supabase";

// Postgres code for a duplicate key
const ALREADY_SAVED = "23505";

// Saves an activity in the favourites of the logged-in customer. The database
// fills in the customer. Saving it twice (e.g. from two screens) is not an error.
export async function addFavourite(activityId: string): Promise<void> {
  const { error } = await supabase
    .from("favourites")
    .insert({ activity_id: activityId });
  if (error && error.code !== ALREADY_SAVED) {
    throw new Error(error.message);
  }
}
