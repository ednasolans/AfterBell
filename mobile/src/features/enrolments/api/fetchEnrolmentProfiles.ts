import { supabase } from "@/lib/supabase";

import { type EnrolmentProfile } from "../types";

// The profiles of the logged-in family, oldest first (the main one first).
// RLS only returns the profiles of the caller's family group.
export async function fetchEnrolmentProfiles(): Promise<EnrolmentProfile[]> {
  const { data, error } = await supabase
    .from("family_profiles")
    .select("id, first_name")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return data.map((row) => ({ id: row.id, firstName: row.first_name }));
}
