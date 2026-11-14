import { type TablesUpdate } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

import { type ProfileForm, type ProfileStatus } from "../types";
import { currentUserId } from "./currentUserId";

// Changes the logged-in provider's profile when its status is one of
// `statuses`. Throws `notFound` when no row was changed.
async function updateMyProfile(
  values: TablesUpdate<"provider_profiles">,
  statuses: ProfileStatus[],
  notFound: string,
): Promise<void> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("provider_profiles")
    .update(values)
    .eq("provider_id", userId)
    .in("status", statuses)
    .select("id");
  if (error) {
    throw new Error(error.message);
  }
  // RLS does not fail when the row cannot be changed: it updates 0 rows
  if (data.length === 0) {
    throw new Error(notFound);
  }
}

// Saves edited text. A draft stays a draft; editing an approved profile moves
// it to pending approval in the database, so customers keep the approved text.
export function saveProfile(form: ProfileForm): Promise<void> {
  return updateMyProfile(
    { headline: form.headline.trim(), description: form.description.trim() },
    ["draft", "pending_approval", "approved"],
    "You do not have a profile to change",
  );
}

// Publishes the current text. approved_at and the approved copy are set by a
// database trigger, never by the app.
export function approveProfile(): Promise<void> {
  return updateMyProfile(
    { status: "approved" },
    ["draft", "pending_approval"],
    "There is no new text to approve",
  );
}

// Goes back to the approved version, dropping the pending text
export async function discardProfileChanges(): Promise<void> {
  const { data, error } = await supabase.rpc("discard_profile_changes");
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("There are no changes to discard");
  }
}
