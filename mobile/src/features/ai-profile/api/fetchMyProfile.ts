import { supabase } from "@/lib/supabase";

import { type ProviderProfile } from "../types";
import { currentUserId } from "./currentUserId";
import { toProviderProfile } from "./toProviderProfile";

// Profile of the logged-in provider, or null if it has not been generated yet.
// RLS lets everyone read approved profiles, so we filter by provider here.
export async function fetchMyProfile(): Promise<ProviderProfile | null> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("provider_profiles")
    .select("*")
    .eq("provider_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  return data.length > 0 ? toProviderProfile(data[0]) : null;
}
