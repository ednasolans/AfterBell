import { type Address } from "@/lib/addresses";
import { supabase } from "@/lib/supabase";

// Addresses of the logged-in provider (entered in its technical sheet),
// in the order they were added, so the main address comes first.
// RLS lets every logged-in user read all addresses, so we filter by provider here.
export async function fetchMyAddresses(): Promise<Address[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("You must be logged in to see your addresses");
  }

  const { data, error } = await supabase
    .from("addresses")
    .select("id, address, city")
    .eq("provider_id", user.id)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
