// Minimal client for any OpenAI-compatible chat completions API.
// The provider is configuration only: base URL, model and API key.

import type { ChatMessage } from "./prompts.ts";

export interface LlmConfig {
  baseUrl: string; // e.g. https://api.openai.com/v1
  apiKey: string;
  model: string;
}

export interface LlmResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

export type LlmErrorCode = "timeout" | "http" | "empty";

export class LlmError extends Error {
  constructor(public readonly code: LlmErrorCode, message: string) {
    super(message);
    this.name = "LlmError";
  }
}

export const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_OUTPUT_TOKENS = 600;

export async function chatCompletion(
  config: LlmConfig,
  messages: ChatMessage[],
  fetchFn: typeof fetch = fetch, // replaced by a fake in tests
): Promise<LlmResult> {
  const started = performance.now();
  let response: Response;
  try {
    response = await fetchFn(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        response_format: { type: "json_object" },
        max_tokens: MAX_OUTPUT_TOKENS,
      }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === "TimeoutError";
    throw new LlmError(isTimeout ? "timeout" : "http", isTimeout ? "LLM timed out" : "LLM request failed");
  }

  if (!response.ok) {
    await response.body?.cancel(); // never forward the provider's error body
    throw new LlmError("http", `LLM returned HTTP ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content === "") {
    throw new LlmError("empty", "LLM returned an empty response");
  }

  return {
    content,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
    latencyMs: Math.round(performance.now() - started),
  };
}