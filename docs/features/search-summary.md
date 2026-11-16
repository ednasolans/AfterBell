# AI search summary (F14)

Above the search results, a customer sees a short summary of them written by
AI (at most 3 sentences). The results never wait for it: they are shown
first, and the summary appears when it is ready or does not appear at all.

## Flow

1. The search screen shows the results.
2. If there is at least one result, `SearchSummary` calls the
   `summarize-search` Edge Function with the same filters.
3. The function runs the same search again with the customer's session, so
   only published activities are used and the app cannot send its own results.
4. It sends the first 10 results to the LLM, validates the answer and returns
   it with a status.
5. The app shows the summary with an **AI summary** label and a note that it
   was written by AI. With any other status, or an error, the block is hidden.

## Edge Function `summarize-search`

`POST` with `{ query, category, city, priceMin, priceMax }` (all optional).
Text is at most 100 characters and prices are numbers ≥ 0.

| Status | Meaning | App |
|---|---|---|
| `READY` | `summary` included | Shows it |
| `NO_RESULTS` | The search found nothing | Hidden |
| `UNAVAILABLE` | Disabled, timeout, LLM error or invalid answer | Hidden |
| `RATE_LIMITED` | Too many summaries for this user | Hidden |

| Code | HTTP | Meaning |
|---|---|---|
| `invalid_request` | 400 | Invalid body or filters |
| `unauthorized` | 401 | No valid session |
| `method_not_allowed` | 405 | Not POST |
| `llm_not_configured` | 500 | Missing LLM secrets |
| `internal_error` | 500 | Unexpected error |

### Rules (#114)

- **Timeout:** 8 s and one attempt. The customer is already looking at the
  results.
- **Cache:** identical searches with the same results reuse the summary for
  30 min (`search_summary_cache`). The key is a SHA-256 hash of the prompt
  version, the normalised filters and the result ids. The search text is never
  stored.
- **Rate limit:** `register_search_summary_request()` counts only real calls to
  the LLM. Cached summaries are free.
- **Service role:** only for the cache and the rate limit, two tables with no
  client access. A user who could write the shared cache could show a fake
  summary to other users. The search uses the caller's session (RLS).
- **Prompt injection:** activity data goes to the LLM inside `<data>…</data>`,
  with the instruction to ignore any instruction in it. `parseSummary` rejects
  answers with links, e-mails, phone numbers, markup or instructions, and
  answers of more than 3 sentences or 400 characters
  (`_shared/searchSummary.ts`, `SUMMARY_PROMPT_VERSION`).
- **Logs:** only `outcome` and `latency_ms`, never the search text or the user.
  Outcomes: `ready`, `cache_hit`, `no_results`, `rate_limited`, `disabled`,
  `timeout`, `llm_error`, `invalid_output`, `error`.

### Configuration

The same `LLM_*` secrets as `generate-profile`, plus optional settings:

| Secret | Default | Use |
|---|---|---|
| `SEARCH_SUMMARY_ENABLED` | `true` | `false` turns the summary off without deploying |
| `SEARCH_SUMMARY_MAX_REQUESTS` | `20` | LLM calls per user and window |
| `SEARCH_SUMMARY_WINDOW_MINUTES` | `60` | Length of the window |

## Mobile app

Code in `mobile/src/features/search-summary/`.

- `api/fetchSearchSummary.ts`: calls the function. Any answer the app does not
  understand is treated as `UNAVAILABLE`.
- `hooks/useSearchSummary.ts`: one query per search (`searchSummaryKeys`, with
  normalised filters). An answer that arrives after the customer changed the
  search is never shown, and the old request is cancelled. No retries.
- `components/SearchSummary.tsx`: placeholder while it loads, summary with the
  AI label, or nothing.

Usage on the search screen:

```tsx
<SearchSummary
  filters={filters}
  enabled={!results.isPending && results.data.length > 0}
/>
```

## How to test locally

```
npx supabase start
npx supabase functions serve --env-file supabase/functions/.env
cd mobile && npx expo start
```

1. Log in as a customer, search and check that the results appear first and
   the summary after them.
2. Repeat the same search: the answer is a `cache_hit` in the function logs.
3. Add `SEARCH_SUMMARY_ENABLED=false` to `.env`, restart `functions serve`:
   the block disappears and the results still work.

Automated tests: `deno test --allow-env` in `supabase/functions` and
`npx jest src/features/search-summary` in `mobile`.