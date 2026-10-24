import { assertEquals } from "jsr:@std/assert@1";
import { LlmError, type LlmResult } from "../_shared/llm.ts";
import type { GeneratedProfile, SheetForPrompt } from "../_shared/types.ts";
import {
  type Deps,
  type ExistingProfile,
  handleRequest,
  HttpError,
  type ProfileRepository,
  type SavedDraft,
} from "../generate-profile/handler.ts";

const SHEET: SheetForPrompt = {
  name: "Escola de Música L'Harmonia",
  provider_type: "music_school",
  activity_types: ["music"],
  facilities: ["wifi"],
  description: "Piano i guitarra.",
  city: "Lleida",
};
const VALID_ANSWER = JSON.stringify({
  headline: "Music lessons in Lleida",
  description: Array(30).fill("word").join(" "),
});
const NOW = new Date("2026-10-24T10:00:00Z");

/** Fake database: records what would be saved instead of saving it. */
class FakeRepo implements ProfileRepository {
  saved: GeneratedProfile[] = [];
  constructor(
    private readonly options: {
      userId?: string | null;
      company?: boolean;
      sheet?: SheetForPrompt | null;
      profile?: ExistingProfile | null;
    } = {},
  ) {}
  getUserId() {
    return Promise.resolve(this.options.userId === undefined ? "user-1" : this.options.userId);
  }
  isCompany() {
    return Promise.resolve(this.options.company ?? true);
  }
  getSheet() {
    return Promise.resolve(this.options.sheet === undefined ? SHEET : this.options.sheet);
  }
  getProfile() {
    return Promise.resolve(this.options.profile ?? null);
  }
  saveDraft(profile: GeneratedProfile, model: string): Promise<SavedDraft> {
    this.saved.push(profile);
    return Promise.resolve({ ...profile, status: "draft", model, generated_at: NOW.toISOString() });
  }
}

const answer = (content: string): LlmResult => ({ content, promptTokens: 0, completionTokens: 0, latencyMs: 1 });

function deps(repo: FakeRepo, llm: Deps["llm"] = () => Promise.resolve(answer(VALID_ANSWER))): Deps {
  return { repo, llm, model: "test-model", now: () => NOW };
}

async function call(d: Deps, method = "POST") {
  const res = await handleRequest(new Request("http://localhost/generate-profile", { method }), d);
  return { status: res.status, body: await res.json() };
}

Deno.test("a company with a sheet gets a saved draft", async () => {
  const repo = new FakeRepo();
  const { status, body } = await call(deps(repo));
  assertEquals(status, 200);
  assertEquals(body.profile.status, "draft");
  assertEquals(body.profile.model, "test-model");
  assertEquals(repo.saved.length, 1);
});

Deno.test("no session is rejected with 401", async () => {
  const { status } = await call(deps(new FakeRepo({ userId: null })));
  assertEquals(status, 401);
});

Deno.test("a customer account is rejected with 403", async () => {
  const repo = new FakeRepo({ company: false });
  const { status } = await call(deps(repo));
  assertEquals(status, 403);
  assertEquals(repo.saved.length, 0);
});

Deno.test("without a technical sheet nothing is generated", async () => {
  const { status, body } = await call(deps(new FakeRepo({ sheet: null })));
  assertEquals(status, 409);
  assertEquals(body.error.code, "no_technical_sheet");
});

Deno.test("an approved profile is not regenerated", async () => {
  const repo = new FakeRepo({ profile: { status: "approved", generatedAt: new Date("2026-10-01") } });
  const { status, body } = await call(deps(repo));
  assertEquals(status, 409);
  assertEquals(body.error.code, "already_approved");
});

Deno.test("generating again within 30 s is rejected", async () => {
  const repo = new FakeRepo({ profile: { status: "draft", generatedAt: new Date(NOW.getTime() - 10_000) } });
  const { status } = await call(deps(repo));
  assertEquals(status, 429);
});

Deno.test("an LLM timeout returns a clear error and saves nothing", async () => {
  const repo = new FakeRepo();
  const { status, body } = await call(deps(repo, () => Promise.reject(new LlmError("timeout", "t"))));
  assertEquals(status, 504);
  assertEquals(body.error.code, "llm_timeout");
  assertEquals(repo.saved.length, 0);
});

Deno.test("an LLM HTTP error returns a clear error and saves nothing", async () => {
  const repo = new FakeRepo();
  const { status, body } = await call(deps(repo, () => Promise.reject(new LlmError("http", "h"))));
  assertEquals(status, 502);
  assertEquals(body.error.code, "llm_unavailable");
  assertEquals(repo.saved.length, 0);
});

Deno.test("an invalid answer is retried once", async () => {
  let calls = 0;
  const llm = () => Promise.resolve(answer(++calls === 1 ? "not json" : VALID_ANSWER));
  const { status } = await call(deps(new FakeRepo(), llm));
  assertEquals(status, 200);
  assertEquals(calls, 2);
});

Deno.test("two invalid answers return an error and save nothing", async () => {
  const repo = new FakeRepo();
  const { status, body } = await call(deps(repo, () => Promise.resolve(answer("not json"))));
  assertEquals(status, 502);
  assertEquals(body.error.code, "invalid_ai_output");
  assertEquals(repo.saved.length, 0);
});

Deno.test("only POST and OPTIONS are allowed", async () => {
  const options = await handleRequest(new Request("http://localhost", { method: "OPTIONS" }), deps(new FakeRepo()));
  assertEquals(options.status, 200);
  await options.body?.cancel();
  const { status } = await call(deps(new FakeRepo()), "GET");
  assertEquals(status, 405);
});

Deno.test("a missing LLM configuration returns a clear 500 error", async () => {
  const notConfigured = () => Promise.reject(new HttpError(500, "llm_not_configured", "Not configured"));
  const { status, body } = await call(deps(new FakeRepo(), notConfigured));
  assertEquals(status, 500);
  assertEquals(body.error.code, "llm_not_configured");
});