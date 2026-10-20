import { supabase } from "@/lib/supabase";

import { type Activity } from "../types";
import { toActivity } from "./toActivity";

// Activities of the logged-in provider, newest first.
// RLS lets every logged-in user read all activities, so we filter by provider here.
export async function fetchMyActivities(): Promise<Activity[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("You must be logged in to see your activities");
  }

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("provider_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data.map(toActivity);
}
