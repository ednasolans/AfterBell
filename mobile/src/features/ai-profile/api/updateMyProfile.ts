import { type TablesUpdate } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

import { type ProfileForm } from "../types";
import { currentUserId } from "./currentUserId";

// Only drafts can be changed: an approved profile is final in Sprint 1
async function updateMyDraft(
  values: TablesUpdate<"provider_profiles">,
): Promise<void> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("provider_profiles")
    .update(values)
    .eq("provider_id", userId)
    .eq("status", "draft")
    .select("id");
  if (error) {
    throw new Error(error.message);
  }
  // RLS does not fail when the row cannot be changed: it updates 0 rows
  if (data.length === 0) {
    throw new Error("You do not have a draft profile to change");
  }
}

export function saveProfile(form: ProfileForm): Promise<void> {
  return updateMyDraft({
    headline: form.headline.trim(),
    description: form.description.trim(),
  });
}

// approved_at is set by a database trigger, never by the app
export function approveProfile(): Promise<void> {
  return updateMyDraft({ status: "approved" });
}
