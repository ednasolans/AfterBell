import { supabase } from "@/lib/supabase";
import { type Activity } from "@/lib/activity";

import { toActivity } from "@/lib/activity";

export async function fetchActivity(id: string): Promise<Activity> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return toActivity(data);
}
