import { supabase } from "@/lib/supabase";
import { type TablesUpdate } from "@/lib/database.types";

import { type ActivityForm } from "../types";
import { toActivityInsert } from "./toActivityInsert";

export type UpdateActivityInput = { id: string; form: ActivityForm };

export async function updateActivity({
  id,
  form,
}: UpdateActivityInput): Promise<void> {
  const { data, error } = await supabase
    .from("activities")
    .update(toActivityInsert(form) as TablesUpdate<"activities">)
    .eq("id", id)
    .select("id");
  if (error) {
    throw new Error(error.message);
  }
  // RLS does not fail when the row belongs to someone else: it updates 0 rows
  if (data.length === 0) {
    throw new Error("The activity does not exist or you cannot edit it");
  }
}
