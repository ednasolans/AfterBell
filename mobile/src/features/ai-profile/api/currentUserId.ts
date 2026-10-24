import { supabase } from "@/lib/supabase";

// Id of the logged-in user, or an error if there is no session
export async function currentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("You must be logged in to manage your profile");
  }
  return user.id;
}
