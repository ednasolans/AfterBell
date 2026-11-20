import { supabase } from "@/lib/supabase";

import { type FavouriteTarget } from "../types";

// Removes an activity from the favourites of a family profile. RLS only lets
// the family delete its own rows; removing one that is not saved does nothing.
export async function removeFavourite({
  familyProfileId,
  activityId,
}: FavouriteTarget): Promise<void> {
  const { error } = await supabase
    .from("favourites")
    .delete()
    .eq("family_profile_id", familyProfileId)
    .eq("activity_id", activityId);
  if (error) {
    throw new Error(error.message);
  }
}
