import { supabase } from "@/lib/supabase";

// True when the technical sheet changed after the AI wrote the profile.
// False when the provider has no profile yet.
export async function fetchProfileIsOutdated(): Promise<boolean> {
  const { data, error } = await supabase.rpc("my_profile_is_outdated");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
