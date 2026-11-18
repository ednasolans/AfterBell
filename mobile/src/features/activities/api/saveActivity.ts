import { supabase } from "@/lib/supabase";

import { type ActivityForm } from "../types";
import { toActivityInsert } from "./toActivityInsert";

export async function saveActivity(
  id: string | null,
  form: ActivityForm,
): Promise<void> {
  const { error } = await supabase.rpc("save_activity_with_languages", {
    ...(id === null ? {} : { p_activity_id: id }),
    p_activity: toActivityInsert(form),
    p_languages:
      form.category === "language"
        ? form.languages.map(({ language, level }) => ({
            language: language.trim(),
            level: level.trim(),
          }))
        : [],
  });
  if (error) {
    throw new Error(error.message);
  }
}
