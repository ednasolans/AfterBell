import { type Coordinates } from "@/lib/location";
import { supabase } from "@/lib/supabase";

// The town of the logged-in family, or null if it has not been saved yet.
// RLS only lets a member read its own family group, so there is one row.
export async function fetchFamilyCity(): Promise<string | null> {
  const { data, error } = await supabase
    .from("family_groups")
    .select("city")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.city ?? null;
}

// Saves the town and its point. The database keeps the point only to about
// 1-2 km (set_family_location), never the exact position.
export async function saveFamilyLocation({
  city,
  coordinates,
}: {
  city: string;
  coordinates: Coordinates;
}): Promise<void> {
  const { error } = await supabase.rpc("set_family_location", {
    p_city: city.trim(),
    p_latitude: coordinates.latitude,
    p_longitude: coordinates.longitude,
  });
  if (error) {
    throw new Error(error.message);
  }
}
