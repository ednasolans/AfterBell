import { supabase } from "@/lib/supabase";

import { type ActivityForm } from "../types";
import { toActivityInsert } from "./toActivityInsert";

export async function createActivity(form: ActivityForm): Promise<void> {
  const { error } = await supabase
    .from("activities")
    .insert(toActivityInsert(form));
  if (error) {
    throw new Error(error.message);
  }
}
