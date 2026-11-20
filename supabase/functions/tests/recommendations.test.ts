import { assertEquals } from "jsr:@std/assert@1";
import {
  type ActivityRow,
  DEFAULT_LIMIT,
  type Deps,
  handleRequest,
  HttpError,
  MAX_LIMIT,
  type RecommendationRow,
  type RecommendationsLogEvent,
  type RecommendOutcome,
} from "../recommendations/handler.ts";

const ana = { id: "profile-1", first_name: "Ana" };

function row(n: number): RecommendationRow {
  return { activity_id: `a${n}`, matched_profiles: [ana], matched_count: 1, distance_meters: n * 100 };
}

function activity(n: number): ActivityRow {
  return { id: `a${n}`, title: `Activity ${n}` };
}

/** Fake database: records what it receives. */
class Fakes {
  recommendCalls: { limit: number; offset: number }[] = [];
  fetchedIds: string[][] = [];
  logs: RecommendationsLogEvent[] = [];

  constructor(
    public options: {
      userId?: string | null;
      outcome?: RecommendOutcome;
      recommendError?: Error;
    } = {},
  ) {}

  deps(): Deps {
    return {
      repo: {
        getUserId: () => Promise.resolve(this.options.userId === undefined ? "user-1" : this.options.userId),
        recommend: (limit, offset) => {
          this.recommendCalls.push({ limit, offset });
          if (this.options.recommendError) return Promise.reject(this.options.recommendError);
          const outcome = this.options.outcome ?? { kind: "rows", rows: [row(1), row(2)] };
          // Like the SQL function: it applies the limit and the offset
          return Promise.resolve(
            outcome.kind === "rows"
              ? { kind: "rows", rows: outcome.rows.slice(offset, offset + limit) } as RecommendOutcome
              : outcome,
          );
        },
        fetchActivities: (ids) => {
          this.fetchedIds.push(ids);
          // Returned in another order: the handler must keep the order of the rows
          return Promise.resolve(ids.map((id) => ({ id, title: `Activity ${id.slice(1)}` })).reverse());
        },
      },
      log: (event) => this.logs.push(event),
    };
  }
}

function request(body?: unknown, method = "POST"): Request {
  return new Request("http://localhost/recommendations", {
    method,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function call(fakes: Fakes, req: Request) {
  const response = await handleRequest(req, fakes.deps());
  return { status: response.status, body: await response.json() };
}

Deno.test("returns the first page with the activities, the matched profiles and the order of the rows", async () => {
  const { status, body } = await call(new Fakes(), request());
  assertEquals(status, 200);
  assertEquals(body.status, "OK");
  assertEquals(body.activities, [
    { activity: activity(1), matched_profiles: [ana], matched_count: 1, distance_meters: 100 },
    { activity: activity(2), matched_profiles: [ana], matched_count: 1, distance_meters: 200 },
  ]);
  assertEquals(body.pagination, { limit: DEFAULT_LIMIT, offset: 0, has_more: false });
});

Deno.test("accepts an empty body and a body without fields", async () => {
  assertEquals((await call(new Fakes(), request(""))).body.pagination.limit, DEFAULT_LIMIT);
  assertEquals((await call(new Fakes(), request({}))).body.pagination.limit, DEFAULT_LIMIT);
});

Deno.test("asks for one more row than the page to know whether there is a next page", async () => {
  const fakes = new Fakes({ outcome: { kind: "rows", rows: [1, 2, 3, 4, 5].map(row) } });
  const { body } = await call(fakes, request({ limit: 2, offset: 0 }));
  assertEquals(fakes.recommendCalls, [{ limit: 3, offset: 0 }]);
  assertEquals(body.activities.map((item: { activity: ActivityRow }) => item.activity.id), ["a1", "a2"]);
  assertEquals(body.pagination, { limit: 2, offset: 0, has_more: true });
});

Deno.test("the last page has no next page and the pages do not repeat rows", async () => {
  const outcome: RecommendOutcome = { kind: "rows", rows: [1, 2, 3, 4, 5].map(row) };
  const ids: string[] = [];
  for (const offset of [0, 2, 4]) {
    const { body } = await call(new Fakes({ outcome }), request({ limit: 2, offset }));
    ids.push(...body.activities.map((item: { activity: ActivityRow }) => item.activity.id));
    assertEquals(body.pagination.has_more, offset < 4);
  }
  assertEquals(ids, ["a1", "a2", "a3", "a4", "a5"]);
});

Deno.test("an empty page after the first one is the end of the list, not 'no matches'", async () => {
  const outcome: RecommendOutcome = { kind: "rows", rows: [row(1)] };
  const { body } = await call(new Fakes({ outcome }), request({ offset: 20 }));
  assertEquals(body.status, "OK");
  assertEquals(body.activities, []);
  assertEquals(body.pagination.has_more, false);
});

Deno.test("an empty list on the first page says NO_MATCHES and does not read activities", async () => {
  const fakes = new Fakes({ outcome: { kind: "rows", rows: [] } });
  const { status, body } = await call(fakes, request());
  assertEquals(status, 200);
  assertEquals(body.status, "NO_MATCHES");
  assertEquals(body.activities, []);
  assertEquals(fakes.fetchedIds, []);
  assertEquals(fakes.logs.map((event) => event.outcome), ["no_matches"]);
});

for (const missing of ["NO_CITY", "NO_PROFILES", "INCOMPLETE_PROFILES"] as const) {
  Deno.test(`says ${missing} when the customer lacks that data`, async () => {
    const fakes = new Fakes({ outcome: { kind: "missing", status: missing } });
    const { status, body } = await call(fakes, request());
    assertEquals(status, 200);
    assertEquals(body, {
      status: missing,
      activities: [],
      pagination: { limit: DEFAULT_LIMIT, offset: 0, has_more: false },
    });
    assertEquals(fakes.fetchedIds, []);
    assertEquals(fakes.logs.map((event) => event.outcome), ["missing_data"]);
  });
}

Deno.test("limit: the maximum is accepted and above it is rejected", async () => {
  const fakes = new Fakes();
  assertEquals((await call(fakes, request({ limit: MAX_LIMIT }))).status, 200);
  assertEquals(fakes.recommendCalls[0].limit, MAX_LIMIT + 1);
  for (const limit of [MAX_LIMIT + 1, 0, -1, 1.5, "10", []]) {
    const rejected = new Fakes();
    const { status, body } = await call(rejected, request({ limit }));
    assertEquals(status, 400);
    assertEquals(body.error.code, "invalid_request");
    assertEquals(rejected.recommendCalls, []);
  }
});

Deno.test("offset must be a whole number of at least 0", async () => {
  for (const offset of [-1, 1.5, "2"]) {
    assertEquals((await call(new Fakes(), request({ offset }))).status, 400);
  }
});

Deno.test("rejects a body that is not a JSON object", async () => {
  for (const body of ["not json", "[1]", "5"]) {
    assertEquals((await call(new Fakes(), request(body))).status, 400);
  }
});

Deno.test("without a valid session it answers 401 and calculates nothing", async () => {
  const fakes = new Fakes({ userId: null });
  const { status, body } = await call(fakes, request());
  assertEquals(status, 401);
  assertEquals(body.error.code, "unauthorized");
  assertEquals(fakes.recommendCalls, []);
  assertEquals(fakes.logs.map((event) => event.outcome), ["unauthorized"]);
});

Deno.test("an account that is not a customer gets 403", async () => {
  const fakes = new Fakes({ recommendError: new HttpError(403, "forbidden", "Only customers") });
  const { status, body } = await call(fakes, request());
  assertEquals(status, 403);
  assertEquals(body.error.code, "forbidden");
  assertEquals(fakes.logs.map((event) => event.outcome), ["forbidden"]);
});

Deno.test("only POST and OPTIONS are accepted", async () => {
  assertEquals((await call(new Fakes(), request(undefined, "GET"))).status, 405);
  const options = await handleRequest(request(undefined, "OPTIONS"), new Fakes().deps());
  assertEquals(options.status, 200);
});

Deno.test("an unexpected error is a 500 that hides the details and logs only outcome and time", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const fakes = new Fakes({ recommendError: new Error("secret database detail") });
    const { status, body } = await call(fakes, request());
    assertEquals(status, 500);
    assertEquals(body, { error: { code: "internal_error", message: "Unexpected error" } });
    assertEquals(fakes.logs.map((event) => event.outcome), ["error"]);
    assertEquals(Object.keys(fakes.logs[0]).sort(), ["latency_ms", "outcome"]);
  } finally {
    console.error = originalError;
  }
});
