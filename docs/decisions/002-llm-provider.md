# 002 – LLM provider for AI profile generation

- **Status:** Accepted
- **Issues:** #27, #28 (parent #26)

## Context

F4 generates a provider's public profile from its technical sheet. The model must use
only the sheet's data, return valid JSON (`headline`, `description`), answer quickly
and cost almost nothing. It is called only from a Supabase Edge Function through an
OpenAI-compatible API, so changing provider means changing three secrets
(`LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`), not code.

Since #56 the technical sheet no longer holds ages, schedule or prices (they belong to
each activity). The profile is generated only from `name`, `provider_type`,
`activity_types`, `facilities` and `city`. Contact data is never sent to the LLM.

## Options evaluated

| Model | Price per 1M tokens (in / out) | Free tier | Result |
|---|---|---|---|
| Google `gemini-3.1-flash-lite` | $0.25 / $1.50 | Yes | Tested |
| Google `gemini-3.5-flash-lite` | $0.30 / $2.50 | Yes | Tested |
| Mistral `mistral-small-latest` | $0.15 / $0.60 | Not available for a personal account (HTTP 429 on every request) | Discarded |
| OpenAI `gpt-5-nano` | $0.025 / $0.20 | No (requires a card) | Not tested |

Prices checked on 2026-10-23; confirm them on each provider's pricing page.

## Method

- Same prompt for every model (`supabase/functions/_shared/prompts.ts`).
- 5 sample sheets, one per provider type (`supabase/functions/_shared/samples/`),
  two of them with empty facilities to check that the model does not fill gaps.
- Script `scripts/llm-compare/compare.ts`: valid JSON, word count, numbers or euros
  in the text (impossible without inventing), latency and token usage.
- Every answer read manually to find invented claims.

## Results

### Prompt iterations

| Version | Change | Outcome |
|---|---|---|
| v1 | 60–120 words | Valid JSON, but invented claims: "metodologia adaptada", "per a tota la família", "centre de referència" |
| v2 | Explicit list of forbidden claims, "shorter is better than invented" | No invented claims; texts became short |
| v3–v4 | Minimum lowered to 15 words | Short sheets produce short, correct profiles |

### Models (prompt v2–v4, 30 calls)

| | gemini-3.1-flash-lite | gemini-3.5-flash-lite |
|---|---|---|
| Latency | 1–15 s | 0.8–1.5 s |
| Timeouts (20 s) | 3 of 20 | 0 of 10 |
| Invented claims | None | None |
| Typos (words joined at apostrophes) | 2 | 0 |
| Avg. tokens per profile | ~370 in + ~100 out | ~370 in + ~80 out |
| Cost per profile | ~$0.00024 | ~$0.00031 |

Last run with the chosen model:

<!-- paste the gemini-3.5-flash-lite table here -->

## Decision

**`gemini-3.5-flash-lite`**: fastest and most reliable in our tests, no invented claims,
no typos. The cost difference with 3.1 is negligible (1,000 profiles ≈ $0.31).

**Output language: Catalan** (pending team confirmation).

## Consequences

- Secrets: `supabase secrets set LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai LLM_MODEL=gemini-3.5-flash-lite LLM_API_KEY=...`
- The free tier may use requests to improve Google's products and is not meant for
  production apps serving EU users. Before real users, switch the project to the paid
  tier and set a spending limit (e.g. 5 €/month) in the billing account.
- Every profile is a draft that the provider reviews before publishing, which also
  covers occasional wording mistakes.
- Revisit if quality drops, prices change, or F14/F10 need a different model.