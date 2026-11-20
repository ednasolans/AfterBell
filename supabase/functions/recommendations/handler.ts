// recommendations (#107): the recommended activities of the logged-in customer,
// one page at a time. The calculation lives in the recommend_activities() SQL
// function (#106); this function adds the activity data, the pagination and a
// clear status when data is missing. Dependencies are passed in so it can be
// tested without Supabase. index.ts connects the real ones.

export const DEFAULT_LIMIT = 20;
// recommend_activities() returns at most 50 rows and one more is asked for to
// know whether there is a next page, so the maximum must stay below 50.
export const MAX_LIMIT = 40;

/**
 * OK: a page of recommendations. NO_MATCHES: the customer's data is complete
 * but nothing fits. The other three say which data the customer must add.
 */
export type RecommendationStatus =
  | "OK"
  | "NO_MATCHES"
  | "NO_CITY"
  | "NO_PROFILES"
  | "INCOMPLETE_PROFILES";

export interface MatchedProfile {
  id: string;
  first_name: string;
}

/** A row of recommend_activities(). */
export interface RecommendationRow {
  activity_id: string;
  matched_profiles: MatchedProfile[];
  matched_count: number;
  distance_meters: number | null;
}

/** An activity as the other customer endpoints return it: a row of `activities`. */
export type ActivityRow = { id: string } & Record<string, unknown>;

/** What recommend_activities() answered: rows, or the data the customer lacks. */
export type RecommendOutcome =
  | { kind: "rows"; rows: RecommendationRow[] }
  | { kind: "missing"; status: Exclude<RecommendationStatus, "OK" | "NO_MATCHES"> };

/** Data access with the caller's session, so RLS applies. */
export interface RecommendationsRepository {
  getUserId(): Promise<string | null>;
  /** Throws HttpError(403) when the account is not a customer. */
  recommend(limit: number, offset: number): Promise<RecommendOutcome>;
  fetchActivities(ids: string[]): Promise<ActivityRow[]>;
}

/** What is logged: an outcome and a time. Never the user or the family data. */
export interface RecommendationsLogEvent {
  outcome: "ok" | "no_matches" | "missing_data" | "forbidden" | "unauthorized" | "invalid_request" | "error";
  latency_ms: number;
}

export interface Deps {
  repo: RecommendationsRepository;
  now?: () => Date;
  log?: (event: RecommendationsLogEvent) => void;
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

function optionalInteger(value: unknown, field: string, min: number, max: number): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new HttpError(400, "invalid_request", `"${field}" must be a whole number from ${min} to ${max}`);
  }
  return value as number;
}

/** The body is optional: { limit?, offset? }. Without it the first page is returned. */
export async function parsePage(req: Request): Promise<{ limit: number; offset: number }> {
  const text = await req.text();
  let input: Record<string, unknown> = {};
  if (text.trim() !== "") {
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new HttpError(400, "invalid_request", "The body must be JSON");
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new HttpError(400, "invalid_request", "The body must be a JSON object");
    }
    input = body as Record<string, unknown>;
  }
  return {
    limit: optionalInteger(input.limit, "limit", 1, MAX_LIMIT) ?? DEFAULT_LIMIT,
    offset: optionalInteger(input.offset, "offset", 0, 100_000) ?? 0,
  };
}

function defaultLog(event: RecommendationsLogEvent): void {
  console.log(JSON.stringify({ fn: "recommendations", ...event }));
}

/** Joins the activities with the rows, in the order of the rows. */
function toItems(rows: RecommendationRow[], activities: ActivityRow[]) {
  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  return rows.flatMap((row) => {
    const activity = byId.get(row.activity_id);
    // RLS could hide an activity between the two queries: it is skipped
    if (!activity) return [];
    return [{
      activity,
      matched_profiles: row.matched_profiles,
      matched_count: row.matched_count,
      distance_meters: row.distance_meters,
    }];
  });
}

export async function handleRequest(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return json(405, { error: { code: "method_not_allowed", message: "Use POST" } });
  }

  const clock = deps.now ?? (() => new Date());
  const started = clock().getTime();
  const log = deps.log ?? defaultLog;
  const reply = (outcome: RecommendationsLogEvent["outcome"], status: number, body: unknown) => {
    log({ outcome, latency_ms: clock().getTime() - started });
    return json(status, body);
  };

  try {
    const { limit, offset } = await parsePage(req);
    const userId = await deps.repo.getUserId();
    if (!userId) throw new HttpError(401, "unauthorized", "Invalid or expired session");

    // One more row than the page tells whether there is a next page
    const outcome = await deps.repo.recommend(limit + 1, offset);
    const pagination = { limit, offset };
    if (outcome.kind === "missing") {
      return reply("missing_data", 200, {
        status: outcome.status,
        activities: [],
        pagination: { ...pagination, has_more: false },
      });
    }

    const page = outcome.rows.slice(0, limit);
    const hasMore = outcome.rows.length > limit;
    const activities = page.length === 0 ? [] : await deps.repo.fetchActivities(page.map((row) => row.activity_id));
    const items = toItems(page, activities);
    // An empty first page is "nothing fits"; an empty later page is only the end of the list
    const noMatches = items.length === 0 && offset === 0;
    return reply(noMatches ? "no_matches" : "ok", 200, {
      status: noMatches ? "NO_MATCHES" : "OK",
      activities: items,
      pagination: { ...pagination, has_more: hasMore },
    });
  } catch (err) {
    if (err instanceof HttpError) {
      const outcome = err.status === 403 ? "forbidden" : err.status === 401 ? "unauthorized" : "invalid_request";
      return reply(outcome, err.status, { error: { code: err.code, message: err.message } });
    }
    log({ outcome: "error", latency_ms: clock().getTime() - started });
    console.error("recommendations: unexpected error", err instanceof Error ? err.message : err);
    return json(500, { error: { code: "internal_error", message: "Unexpected error" } });
  }
}
