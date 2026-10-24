// Manual end-to-end test of the generate-profile Edge Function (#30).
// Creates a test company with an address and a technical sheet in the LOCAL
// database, calls the function twice and prints the saved draft.
//
// Usage (PowerShell), with `npx supabase start` and `functions serve` running:
//   $env:SUPABASE_ANON_KEY = "<Publishable key from npx supabase status>"
//   deno run --allow-net --allow-env scripts/try-generate-profile.ts

import { createClient, FunctionsHttpError } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL") ?? "http://127.0.0.1:54321";
const key = Deno.env.get("SUPABASE_ANON_KEY");
if (!key) throw new Error("Set SUPABASE_ANON_KEY (Publishable key from `npx supabase status`)");
if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
  throw new Error("This script only runs against the local Supabase");
}

const supabase = createClient(url, key);

async function callFunction(label: string) {
  const { data, error } = await supabase.functions.invoke("generate-profile");
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    console.log(`${label}: HTTP ${res.status}`, await res.json());
  } else if (error) {
    console.log(`${label}: error`, error.message);
  } else {
    console.log(`${label}: OK`, data);
  }
}

// 1. A new company account (local sign-up does not need email confirmation)
const email = `demo-${Date.now()}@test.dev`;
const { data: auth, error: signUpError } = await supabase.auth.signUp({
  email,
  password: "Test-password-1",
  options: { data: { account_type: "company" } },
});
if (signUpError || !auth.session) {
  throw new Error(`Sign-up failed: ${signUpError?.message ?? "no session (email confirmation on?)"}`);
}
console.log(`Company created: ${email}`);

// 2. Its address and technical sheet
const { data: address, error: addressError } = await supabase
  .from("addresses")
  .insert({ address: "Avinguda Prat de la Riba, 40", city: "Lleida" })
  .select("id")
  .single();
if (addressError) throw new Error(`Address failed: ${addressError.message}`);

const { error: sheetError } = await supabase.from("technical_sheets").insert({
  name: "Escola de Música L'Harmonia",
  provider_type: "music_school",
  activity_types: ["music"],
  facilities: ["waiting_area", "air_conditioning", "wheelchair_access"],
  description: "Classes individuals i en grup de piano, guitarra i cant.",
  address_id: address.id,
  email: "info@harmonia-exemple.cat",
});
if (sheetError) throw new Error(`Technical sheet failed: ${sheetError.message}`);
console.log("Technical sheet created\n");

// 3. Generate the profile, then try again at once (must be rejected with 429)
await callFunction("First call");
await callFunction("Second call");

// 4. What is saved in the table
const { data: saved } = await supabase.from("provider_profiles").select("*").single();
console.log("\nSaved in provider_profiles:", saved);