// summarize-search (#112, #114): search filters -> the same search -> AI summary.
// The app calls it after showing the results, so the results never wait for
// the LLM. All the logic lives here, with its dependencies passed in, so it
// can be tested without Supabase or a real LLM. index.ts connects the real ones.

import { LlmError, type LlmResult } from "../_shared/llm.ts";
import type { ChatMessage } from "../_shared/prompts.ts";
import {
  buildSummaryMessages,
  parseSummary,
  type ResultForSummary,
  type SearchFilters,
  SUMMARY_MAX_RESULTS,
  SUMMARY_PROMPT_VERSION,
  SummaryValidationError,
} from "../_shared/searchSummary.ts";

/**
 * READY: summary included. NO_RESULTS: the search found nothing.
 * UNAVAILABLE: disabled, timeout or invalid answer (the app hides the block).
 * RATE_LIMITED: too many summaries for this user in the current period.
 */
export type SummaryStatus = "READY" | "NO_RESULTS" | "UNAVAILABLE" | "RATE_LIMITED";

/** The results never wait for the summary, but the customer should not either. */
export const SUMMARY_TIMEOUT_MS = 8_000;
/** Identical searches reuse the summary for this long. */
export const CACHE_TTL_MS = 30 * 60_000;
const TEXT_MAX_CHARS = 100;
// Same minimum as search_activities, which rejects shorter texts with an error
const QUERY_MIN_CHARS = 2;
// There are a dozen categories in the catalogue
const MAX_CATEGORIES = 20;

/** A search result with its id, so the cache key changes when results change. */
export interface SearchResult extends ResultForSummary {
  id: string;
}

/** Data access with the caller's session, so RLS applies. */
export interface SummaryRepository {
  getUserId(): Promise<string | null>;
  search(filters: SearchFilters, limit: number): Promise<SearchResult[]>;
}

/** Shared summaries. Only the backend (service role) can read or write them. */
export interface SummaryCache {
  get(key: string): Promise<string | null>;
  set(key: string, summary: string, expiresAt: Date): Promise<void>;
}

/** Counts a summary request; false when the user is over the limit. */
export interface RateLimiter {
  allow(userId: string): Promise<boolean>;
}

/** What is logged: an outcome and a time. Never the search text or the user. */
export interface SummaryLogEvent {
  outcome:
    | "ready"
    | "cache_hit"
    | "no_results"
    | "rate_limited"
    | "disabled"
    | "timeout"
    | "llm_error"
    | "invalid_output"
    | "error";
  latency_ms: number;
}

export interface Deps {
  repo: SummaryRepository;
  cache: SummaryCache;
  limiter: RateLimiter;
  llm: (messages: ChatMessage[], timeoutMs: number) => Promise<LlmResult>;
  /** SEARCH_SUMMARY_ENABLED: turns the feature off without deploying code. */
  enabled: boolean;
  now?: () => Date;
  log?: (event: SummaryLogEvent) => void;
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** An error that becomes an HTTP response with a code. */
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

function optionalText(value: unknown, field: string, maxChars: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > maxChars) {
    throw new HttpError(400, "invalid_request", `"${field}" must be text of at most ${maxChars} characters`);
  }
  const text = value.trim();
  return text === "" ? null : text;
}

function optionalPrice(value: unknown, field: string): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new HttpError(400, "invalid_request", `"${field}" must be a positive number`);
  }
  return value;
}

function optionalAge(value: unknown, field: string): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new HttpError(400, "invalid_request", `"${field}" must be a whole number of years`);
  }
  return value as number;
}

/** A list of category names; an empty list is no filter. */
function optionalCategories(value: unknown): string[] | null {
  if (value === undefined || value === null) return null;
  if (
    !Array.isArray(value) || value.length > MAX_CATEGORIES ||
    value.some((name) => typeof name !== "string" || name.length > TEXT_MAX_CHARS)
  ) {
    throw new HttpError(400, "invalid_request", `"categories" must be a list of at most ${MAX_CATEGORIES} names`);
  }
  return value.length === 0 ? null : value;
}

/**
 * The body has the same filters as the search: { query, categories, ageMin, ageMax,
 * city, postalCode, priceMin, priceMax, pricePeriod }. The rules between them
 * (e.g. minimum not above maximum) are checked by search_activities.
 */
export async function parseFilters(req: Request): Promise<SearchFilters> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "invalid_request", "The body must be JSON");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "invalid_request", "The body must be a JSON object");
  }
  const input = body as Record<string, unknown>;
  const query = optionalText(input.query, "query", TEXT_MAX_CHARS);
  if (query !== null && query.length < QUERY_MIN_CHARS) {
    throw new HttpError(400, "invalid_request", `"query" must have at least ${QUERY_MIN_CHARS} characters`);
  }
  return {
    query,
    categories: optionalCategories(input.categories),
    ageMin: optionalAge(input.ageMin, "ageMin"),
    ageMax: optionalAge(input.ageMax, "ageMax"),
    city: optionalText(input.city, "city", TEXT_MAX_CHARS),
    postalCode: optionalText(input.postalCode, "postalCode", TEXT_MAX_CHARS),
    priceMin: optionalPrice(input.priceMin, "priceMin"),
    priceMax: optionalPrice(input.priceMax, "priceMax"),
    pricePeriod: optionalText(input.pricePeriod, "pricePeriod", TEXT_MAX_CHARS),
  };
}

/**
 * Same search and same results -> same key. Text is compared without case or
 * extra spaces, and the ids of the results make a new key as soon as the
 * results change. The key is a hash: the search text is not stored.
 */
export async function cacheKey(filters: SearchFilters, results: SearchResult[]): Promise<string> {
  const normalise = (text: string | null) => text?.toLowerCase().replace(/\s+/g, " ").trim() ?? null;
  const source = JSON.stringify([
    SUMMARY_PROMPT_VERSION,
    normalise(filters.query),
    filters.categories,
    filters.ageMin,
    filters.ageMax,
    normalise(filters.city),
    normalise(filters.postalCode),
    filters.priceMin,
    filters.priceMax,
    filters.pricePeriod,
    results.map((result) => result.id),
  ]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function defaultLog(event: SummaryLogEvent): void {
  console.log(JSON.stringify({ fn: "summarize-search", ...event }));
}

/** Calls the LLM once. The caller decides the status from the error. */
async function generate(deps: Deps, filters: SearchFilters, results: SearchResult[]): Promise<string> {
  const result = await deps.llm(buildSummaryMessages(filters, results), SUMMARY_TIMEOUT_MS);
  return parseSummary(result.content);
}

function failureOutcome(err: unknown): SummaryLogEvent["outcome"] | null {
  if (err instanceof LlmError) return err.code === "timeout" ? "timeout" : "llm_error";
  if (err instanceof SummaryValidationError) return "invalid_output";
  return null;
}

export async function handleRequest(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return json(405, { error: { code: "method_not_allowed", message: "Use POST" } });
  }

  const clock = deps.now ?? (() => new Date());
  const started = clock().getTime();
  const log = deps.log ?? defaultLog;
  const reply = (outcome: SummaryLogEvent["outcome"], status: SummaryStatus, summary?: string) => {
    log({ outcome, latency_ms: clock().getTime() - started });
    return json(200, summary === undefined ? { status } : { status, summary });
  };

  try {
    const filters = await parseFilters(req);
    const userId = await deps.repo.getUserId();
    if (!userId) throw new HttpError(401, "unauthorized", "Invalid or expired session");
    if (!deps.enabled) return reply("disabled", "UNAVAILABLE");

    // The same search as the app, with the customer's session: only published activities
    const results = await deps.repo.search(filters, SUMMARY_MAX_RESULTS);
    if (results.length === 0) return reply("no_results", "NO_RESULTS");

    const key = await cacheKey(filters, results);
    const cached = await deps.cache.get(key);
    if (cached !== null) return reply("cache_hit", "READY", cached);

    // Only calls to the LLM count towards the limit: cached summaries are free
    if (!(await deps.limiter.allow(userId))) return reply("rate_limited", "RATE_LIMITED");

    let summary: string;
    try {
      summary = await generate(deps, filters, results);
    } catch (err) {
      const outcome = failureOutcome(err);
      if (outcome === null) throw err;
      return reply(outcome, "UNAVAILABLE");
    }

    try {
      await deps.cache.set(key, summary, new Date(clock().getTime() + CACHE_TTL_MS));
    } catch {
      // A summary that cannot be cached is still a valid answer
    }
    return reply("ready", "READY", summary);
  } catch (err) {
    if (err instanceof HttpError) {
      return json(err.status, { error: { code: err.code, message: err.message } });
    }
    log({ outcome: "error", latency_ms: clock().getTime() - started });
    console.error("summarize-search: unexpected error", err instanceof Error ? err.message : err);
    return json(500, { error: { code: "internal_error", message: "Unexpected error" } });
  }
}