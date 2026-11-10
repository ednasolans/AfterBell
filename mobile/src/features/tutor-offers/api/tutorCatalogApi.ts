
import { supabase } from "@/lib/supabase";

import { type TutorCatalogItem } from "../types";

// Lists the subjects allowed by the database catalogue.
export async function fetchTutorSubjects():
  Promise<TutorCatalogItem[]> {
  const { data, error } = await supabase
    .from("tutor_subjects")
    .select("code, name")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

// Lists the education levels allowed by the database.
export async function fetchTutorLevels():
  Promise<TutorCatalogItem[]> {
  const { data, error } = await supabase
    .from("tutor_levels")
    .select("code, name")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function fetchTutorCatalogues() {
  const [subjects, levels] = await Promise.all([
    fetchTutorSubjects(),
    fetchTutorLevels(),
  ]);

  return { subjects, levels };
}
