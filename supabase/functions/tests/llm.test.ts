import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { chatCompletion, LlmError } from "../_shared/llm.ts";

const config = { baseUrl: "https://fake.test/v1", apiKey: "k", model: "m" };
const fakeFetch = (result: Response | Error): typeof fetch => () =>
  result instanceof Error ? Promise.reject(result) : Promise.resolve(result);

Deno.test("returns the content and token usage", async () => {
  const body = { choices: [{ message: { content: "{}" } }], usage: { prompt_tokens: 10, completion_tokens: 5 } };
  const result = await chatCompletion(config, [], fakeFetch(new Response(JSON.stringify(body))));
  assertEquals(result.content, "{}");
  assertEquals(result.promptTokens, 10);
  assertEquals(result.completionTokens, 5);
});

Deno.test("HTTP error becomes an LlmError", async () => {
  const err = await assertRejects(
    () => chatCompletion(config, [], fakeFetch(new Response("boom", { status: 500 }))),
    LlmError,
  );
  assertEquals(err.code, "http");
});

Deno.test("timeout becomes an LlmError", async () => {
  const err = await assertRejects(
    () => chatCompletion(config, [], fakeFetch(new DOMException("t", "TimeoutError"))),
    LlmError,
  );
  assertEquals(err.code, "timeout");
});

Deno.test("empty answer becomes an LlmError", async () => {
  const body = { choices: [] };
  const err = await assertRejects(
    () => chatCompletion(config, [], fakeFetch(new Response(JSON.stringify(body)))),
    LlmError,
  );
  assertEquals(err.code, "empty");
});