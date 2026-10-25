// Entry point of the generate-profile Edge Function (#30).
// Local run: npx supabase functions serve generate-profile --env-file supabase/functions/.env
// Secrets in the cloud: supabase secrets set LLM_BASE_URL=... LLM_MODEL=... LLM_API_KEY=...

import { createClient } from "npm:@supabase/supabase-js@2";
import { chatCompletion, type LlmConfig } from "../_shared/llm.ts";
import type { ChatMessage } from "../_shared/prompts.ts";
import { handleRequest, HttpError } from "./handler.ts";
import { SupabaseProfileRepository } from "./repository.ts";

function llmConfigFromEnv(): LlmConfig {
  const baseUrl = Deno.env.get("LLM_BASE_URL");
  const model = Deno.env.get("LLM_MODEL");
  const apiKey = Deno.env.get("LLM_API_KEY");
  if (!baseUrl || !model || !apiKey) {
    throw new HttpError(500, "llm_not_configured", "The AI service is not configured");
  }
  return { baseUrl, model, apiKey };
}

Deno.serve((req) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  // Client acting as the caller, so RLS applies to every query.
  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );

  return handleRequest(req, {
    repo: new SupabaseProfileRepository(client, token),
    // The config is read on each call, so a missing secret becomes a clear 500 error.
    llm: (messages: ChatMessage[]) => chatCompletion(llmConfigFromEnv(), messages),
    model: Deno.env.get("LLM_MODEL") ?? "unknown",
  });
});