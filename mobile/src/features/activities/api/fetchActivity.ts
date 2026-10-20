import { supabase } from "@/lib/supabase";

import { type Activity } from "../types";
import { toActivity } from "./toActivity";

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
