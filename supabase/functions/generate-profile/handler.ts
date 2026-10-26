// generate-profile (#30): technical sheet -> LLM -> draft in provider_profiles.
// All the logic lives here, with its dependencies passed in, so it can be
// tested without Supabase or a real LLM. index.ts connects the real ones.

import { LlmError, type LlmResult } from "../_shared/llm.ts";
import { buildMessages, type ChatMessage } from "../_shared/prompts.ts";
import { parseProfile, ProfileValidationError } from "../_shared/profile.ts";
import type { GeneratedProfile, SheetForPrompt } from "../_shared/types.ts";

/** Minimum time between two generations of the same provider. */
export const COOLDOWN_MS = 30_000;

export interface ExistingProfile {
  status: string;
  generatedAt: Date;
}

export interface SavedDraft extends GeneratedProfile {
  status: string;
  model: string;
  generated_at: string;
}

/** Data access. The real one (repository.ts) uses the caller's session, so RLS applies. */
export interface ProfileRepository {
  getUserId(): Promise<string | null>;
  isCompany(): Promise<boolean>;
  getSheet(userId: string): Promise<SheetForPrompt | null>;
  getProfile(userId: string): Promise<ExistingProfile | null>;
  saveDraft(profile: GeneratedProfile, model: string): Promise<SavedDraft>;
}

export interface Deps {
  repo: ProfileRepository;
  llm: (messages: ChatMessage[]) => Promise<LlmResult>;
  model: string;
  now?: () => Date;
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** An error that becomes an HTTP response with a code the app can show. */
export class HttpError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/** Checks who is calling and returns their technical sheet. */
async function loadSheet(repo: ProfileRepository): Promise<{ userId: string; sheet: SheetForPrompt }> {
  const userId = await repo.getUserId();
  if (!userId) throw new HttpError(401, "unauthorized", "Invalid or expired session");
  if (!(await repo.isCompany())) throw new HttpError(403, "forbidden", "Only companies can generate a profile");

  const sheet = await repo.getSheet(userId);
  if (!sheet) throw new HttpError(409, "no_technical_sheet", "Save the technical sheet first");
  return { userId, sheet };
}

/** Rejects regenerating an approved profile (Sprint 2) or generating too often. */
async function checkCanGenerate(deps: Deps, userId: string): Promise<void> {
  const profile = await deps.repo.getProfile(userId);
  if (!profile) return;
  if (profile.status === "approved") {
    throw new HttpError(409, "already_approved", "The profile is already published");
  }
  const now = (deps.now ?? (() => new Date()))();
  if (now.getTime() - profile.generatedAt.getTime() < COOLDOWN_MS) {
    throw new HttpError(429, "too_many_requests", "Wait a few seconds before generating again");
  }
}

function toHttpError(err: LlmError): HttpError {
  if (err.code === "timeout") {
    return new HttpError(504, "llm_timeout", "The AI service took too long. Try again.");
  }
  return new HttpError(502, "llm_unavailable", "The AI service is not available. Try again later.");
}

/** Calls the LLM. If the answer is not valid it tries once more. */
async function generate(deps: Deps, sheet: SheetForPrompt): Promise<GeneratedProfile> {
  const messages = buildMessages(sheet);
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await deps.llm(messages);
      return parseProfile(result.content);
    } catch (err) {
      if (err instanceof LlmError) throw toHttpError(err);
      if (!(err instanceof ProfileValidationError)) throw err;
    }
  }
  throw new HttpError(502, "invalid_ai_output", "The AI answer was not valid. Try again.");
}

export async function handleRequest(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return json(405, { error: { code: "method_not_allowed", message: "Use POST" } });
  }

  try {
    const { userId, sheet } = await loadSheet(deps.repo);
    await checkCanGenerate(deps, userId);
    const profile = await generate(deps, sheet);
    // Saved only after a valid answer: if the LLM fails, nothing is written.
    const draft = await deps.repo.saveDraft(profile, deps.model);
    return json(200, { profile: draft });
  } catch (err) {
    if (err instanceof HttpError) {
      return json(err.status, { error: { code: err.code, message: err.message } });
    }
    console.error("generate-profile: unexpected error", err instanceof Error ? err.message : err);
    return json(500, { error: { code: "internal_error", message: "Unexpected error" } });
  }
}