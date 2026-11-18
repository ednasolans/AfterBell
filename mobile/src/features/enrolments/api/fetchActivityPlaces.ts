import { supabase } from "@/lib/supabase";

import { type ActivityPlaces } from "../types";

// The places of every activity of the logged-in provider, in one call
export async function fetchActivityPlaces(): Promise<ActivityPlaces[]> {
  const { data, error } = await supabase.rpc("provider_activity_capacities");
  if (error) {
    throw new Error(error.message);
  }
  return data.map((row) => ({
    activityId: row.activity_id,
    activityTitle: row.activity_title,
    // Null when there is no limit, although the generated types say otherwise
    maxParticipants: (row.max_participants as number | null) ?? null,
    takenPlaces: row.taken_places,
    availablePlaces: (row.available_places as number | null) ?? null,
  }));
}
