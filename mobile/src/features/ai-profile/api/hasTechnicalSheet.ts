import { supabase } from "@/lib/supabase";

import { currentUserId } from "./currentUserId";

// True when the logged-in provider has saved its technical sheet
export async function hasTechnicalSheet(): Promise<boolean> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("technical_sheets")
    .select("id")
    .eq("provider_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  return data.length > 0;
}
