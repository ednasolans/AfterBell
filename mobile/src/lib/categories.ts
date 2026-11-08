import { categoryLabel } from "@/lib/activityCategories";
import { supabase } from "@/lib/supabase";

// Values of categories.category_type (CHECK constraint)
export const CATEGORY_TYPES = ["individual", "collective"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

// One category of the `categories` table (#86). `name` is the value stored in
// activities.category, technical_sheets.activity_types and family_profiles.interests.
export type Category = {
  name: string;
  type: CategoryType;
};

// The category catalogue, ordered by label. It changes only with migrations.
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("name, category_type");
  if (error) {
    throw new Error(error.message);
  }
  return data
    .map((row) => ({
      name: row.name,
      // The CHECK constraint guarantees the value
      type: row.category_type as CategoryType,
    }))
    .sort((a, b) => categoryLabel(a.name).localeCompare(categoryLabel(b.name)));
}
