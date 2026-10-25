// LLM comparison for #27.
// Runs the real prompt (#28) on the 5 sample sheets with ONE model
// and prints a summary table. Raw answers are saved in ./out for manual review.
//
// Usage (PowerShell):
//   $env:LLM_BASE_URL = "..."; $env:LLM_MODEL = "..."; $env:LLM_API_KEY = "..."
//   deno run --allow-read --allow-write --allow-net --allow-env scripts/llm-compare/compare.ts

import { chatCompletion, type LlmConfig } from "../../supabase/functions/_shared/llm.ts";
import { buildMessages } from "../../supabase/functions/_shared/prompts.ts";
import { countWords, parseProfile } from "../../supabase/functions/_shared/profile.ts";
import type { SheetForPrompt } from "../../supabase/functions/_shared/types.ts";

const SAMPLES_DIR = new URL("../../supabase/functions/_shared/samples/", import.meta.url);
const OUT_DIR = new URL("./out/", import.meta.url);

function readConfig(): LlmConfig {
  const baseUrl = Deno.env.get("LLM_BASE_URL");
  const model = Deno.env.get("LLM_MODEL");
  const apiKey = Deno.env.get("LLM_API_KEY");
  if (!baseUrl || !model || !apiKey) {
    throw new Error("Set LLM_BASE_URL, LLM_MODEL and LLM_API_KEY first");
  }
  return { baseUrl, model, apiKey };
}

/** Numbers or euro signs suggest invented ages, prices or timetables. */
function suspiciousFacts(text: string): boolean {
  return /\d|€|euro/i.test(text);
}

async function runSample(config: LlmConfig, fileName: string) {
  const sheet: SheetForPrompt = JSON.parse(await Deno.readTextFile(new URL(fileName, SAMPLES_DIR)));
  const row = { sample: fileName, valid: "no", words: "-", suspicious: "-", ms: "-", tokens: "-" };
  let raw = "";
  try {
    const result = await chatCompletion(config, buildMessages(sheet));
    raw = result.content;
    row.ms = String(result.latencyMs);
    row.tokens = `${result.promptTokens}+${result.completionTokens}`;
    const profile = parseProfile(raw);
    row.valid = "yes";
    row.words = String(countWords(profile.description));
    row.suspicious = suspiciousFacts(`${profile.headline} ${profile.description}`) ? "CHECK" : "ok";
  } catch (err) {
    row.valid = `no (${err instanceof Error ? err.message : err})`;
  }
  const outFile = new URL(`${config.model}__${fileName}`, OUT_DIR);
  await Deno.writeTextFile(outFile, JSON.stringify({ row, raw }, null, 2));
  return row;
}

if (import.meta.main) {
  const config = readConfig();
  await Deno.mkdir(OUT_DIR, { recursive: true });
  const rows = [];
  for await (const entry of Deno.readDir(SAMPLES_DIR)) {
    if (entry.name.endsWith(".json")) rows.push(await runSample(config, entry.name));
  }
  console.log(`\nModel: ${config.model}\n`);
  console.table(rows);
}