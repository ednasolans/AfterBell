import { supabase } from "@/lib/supabase";

import { type FavouriteTarget } from "../types";

// Postgres code for a duplicate key
const ALREADY_SAVED = "23505";

// Saves an activity in the favourites of a family profile. RLS only accepts
// profiles of the customer's family. Saving it twice (e.g. from two screens)
// is not an error.
export async function addFavourite({
  familyProfileId,
  activityId,
}: FavouriteTarget): Promise<void> {
  const { error } = await supabase
    .from("favourites")
    .insert({ family_profile_id: familyProfileId, activity_id: activityId });
  if (error && error.code !== ALREADY_SAVED) {
    throw new Error(error.message);
  }
}
