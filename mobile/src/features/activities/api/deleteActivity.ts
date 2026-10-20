import { supabase } from "@/lib/supabase";

export async function deleteActivity(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("activities")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    throw new Error(error.message);
  }
  // RLS does not fail when the row belongs to someone else: it deletes 0 rows
  if (data.length === 0) {
    throw new Error("The activity does not exist or you cannot delete it");
  }
}
