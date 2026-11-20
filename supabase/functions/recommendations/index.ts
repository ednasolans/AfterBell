// Entry point of the recommendations Edge Function (#107).
// Local run: npx supabase functions serve recommendations --env-file supabase/functions/.env

import { createClient } from "npm:@supabase/supabase-js@2";
import { handleRequest } from "./handler.ts";
import { SupabaseRecommendationsRepository } from "./repository.ts";

Deno.serve((req) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  // Client acting as the caller, so RLS applies to every query.
  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );

  return handleRequest(req, { repo: new SupabaseRecommendationsRepository(client, token) });
});
