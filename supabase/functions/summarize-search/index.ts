// Entry point of the summarize-search Edge Function (#112, #114).
// Local run: npx supabase functions serve summarize-search --env-file supabase/functions/.env
// Secrets: the same LLM_* as generate-profile, plus optional
//   SEARCH_SUMMARY_ENABLED=false            turns the summary off (no deploy needed)
//   SEARCH_SUMMARY_MAX_REQUESTS=20          LLM calls per user and window
//   SEARCH_SUMMARY_WINDOW_MINUTES=60

import { createClient } from "npm:@supabase/supabase-js@2";
import { chatCompletion, type LlmConfig } from "../_shared/llm.ts";
import type { ChatMessage } from "../_shared/prompts.ts";
import { handleRequest, HttpError } from "./handler.ts";
import { SupabaseSummaryRepository, SupabaseSummaryStore } from "./repository.ts";

function llmConfigFromEnv(): LlmConfig {
  const baseUrl = Deno.env.get("LLM_BASE_URL");
  const model = Deno.env.get("LLM_MODEL");
  const apiKey = Deno.env.get("LLM_API_KEY");
  if (!baseUrl || !model || !apiKey) {
    throw new HttpError(500, "llm_not_configured", "The AI service is not configured");
  }
  return { baseUrl, model, apiKey };
}

function positiveIntFromEnv(name: string, fallback: number): number {
  const value = Number(Deno.env.get(name));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

Deno.serve((req) => {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  // Client acting as the caller, so RLS applies to the search.
  const client = createClient(
    url,
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  // Service role client, only for the cache and the rate limit.
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });
  const store = new SupabaseSummaryStore(
    admin,
    positiveIntFromEnv("SEARCH_SUMMARY_MAX_REQUESTS", 20),
    positiveIntFromEnv("SEARCH_SUMMARY_WINDOW_MINUTES", 60),
  );

  return handleRequest(req, {
    repo: new SupabaseSummaryRepository(client, token),
    cache: store,
    limiter: store,
    // The config is read on each call, so a missing secret becomes a clear 500 error.
    llm: (messages: ChatMessage[], timeoutMs: number) =>
      chatCompletion(llmConfigFromEnv(), messages, fetch, timeoutMs),
    enabled: Deno.env.get("SEARCH_SUMMARY_ENABLED") !== "false",
  });
});