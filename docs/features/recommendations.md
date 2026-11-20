# Recommendations (#106, #107, C7)

Which activities are suggested to a customer. It is calculated in the database
at the moment of the request, from structured data only (age, interests and
town), never from free text. The function is `recommend_activities`. The app does
not call it directly: it uses the Edge Function `recommendations` (#107), which
adds the activity data, the pagination and a clear status when data is missing.
The app screens belong to #108.

## API: `recommend_activities(p_limit, p_offset)`

No ids or town are passed: the family is always the one of the logged-in account
(`SECURITY INVOKER`, so RLS applies too), and nobody can ask for another family.

| Argument   | Meaning                         |
| ---------- | ------------------------------- |
| `p_limit`  | Page size: 1–50, default 20     |
| `p_offset` | Rows to skip (`page * p_limit`) |

It returns one row per activity, so there are no duplicates:

| Column             | Meaning                                                                           |
| ------------------ | --------------------------------------------------------------------------------- |
| `activity_id`      | The activity. The caller reads the card data (title, price…) with this id         |
| `matched_profiles` | `[{ "id", "first_name" }]` of the profiles that fit it, to explain the suggestion |
| `matched_count`    | How many profiles fit it                                                          |
| `distance_meters`  | From the (blurred) point of the family to the activity. `NULL` without a point    |

| Error                                 | SQLSTATE | When                                              |
| ------------------------------------- | -------- | ------------------------------------------------- |
| `recommendations_not_a_customer`      | 42501    | The account has no family group (a provider)      |
| `recommendations_no_city`             | 22023    | The family has not saved its town                 |
| `recommendations_no_profiles`         | 22023    | The family has no profiles                        |
| `recommendations_incomplete_profiles` | 22023    | No profile has both a date of birth and interests |

## Endpoint: Edge Function `recommendations` (#107)

`POST` with the session of the customer. The body is optional: `{ limit?, offset? }`.

| Field    | Meaning                                | Default |
| -------- | -------------------------------------- | ------- |
| `limit`  | Page size, whole number from 1 to 40   | 20      |
| `offset` | Items to skip (`page * limit`), from 0 | 0       |

The maximum is 40 and not 50 because the function asks `recommend_activities`
for one more row than the page (`limit + 1`) to know whether there is a next
page, and that function never returns more than 50 rows.

```json
{
  "status": "OK",
  "activities": [
    {
      "activity": { "id": "…", "title": "…", "…": "a row of `activities`" },
      "matched_profiles": [{ "id": "…", "first_name": "Marc" }],
      "matched_count": 1,
      "distance_meters": 120
    }
  ],
  "pagination": { "limit": 20, "offset": 0, "has_more": false }
}
```

`activity` has the same format as the activities of the search
(`search_activities` returns rows of `activities`), so the app reads it with
`toActivity`. The order is the one of `recommend_activities`.

### Status

The status says what the customer has to do, so an empty list is never
unexplained. They are answered with HTTP 200 and an empty `activities` list.

| `status`              | Meaning                                                         | The customer has to…                                 |
| --------------------- | --------------------------------------------------------------- | ---------------------------------------------------- |
| `OK`                  | A page of recommendations (it can be empty after the last page) | nothing                                              |
| `NO_MATCHES`          | Complete data, but nothing fits (first page)                    | wait for new activities, or change interests or town |
| `NO_CITY`             | The family has not saved its town                               | save the town                                        |
| `NO_PROFILES`         | The family has no profiles                                      | create a profile                                     |
| `INCOMPLETE_PROFILES` | No profile has date of birth and interests                      | complete a profile                                   |

`recommend_activities` stops at the first missing data (town, then profiles), so
a customer lacking both is told about the town first.

### Errors

| Code                 | HTTP | Meaning                                                  |
| -------------------- | ---- | -------------------------------------------------------- |
| `invalid_request`    | 400  | `limit` or `offset` not valid, or body not a JSON object |
| `unauthorized`       | 401  | No valid session                                         |
| `forbidden`          | 403  | The account is not a customer (a provider)               |
| `method_not_allowed` | 405  | Not POST                                                 |
| `internal_error`     | 500  | Unexpected error (the details are only in the logs)      |

### Rules

- **Only the customer's own data.** The function runs with the session of the
  caller, never the service role key, and passes no ids: `recommend_activities`
  always uses the family of `auth.uid()`. The activities are read with RLS.
- **Logs:** only `outcome` and `latency_ms`, never the user or the family data.
- **Cache (decision):** the Edge Function has **no** server cache. The query is
  cheap (it uses existing indexes), and a shared cache would store data derived
  from minors' profiles and would have to be invalidated whenever a profile, the
  town or an activity changes. A short cache lives in the app instead: TanStack
  Query keeps a page for 5 minutes (`RECOMMENDATIONS_STALE_MS`), so showing the
  screen again does not recalculate anything. The cache is per device and is
  cleared on logout.
  Trade-off: after editing a profile or the town the list can be up to 5 minutes
  old unless the screen invalidates `recommendationKeys.all` (see #108).

## Mobile app

Code in `mobile/src/features/recommendations/`.

- `api/fetchRecommendations.ts`: calls the function and maps the answer to
  `RecommendationsPage` (`status`, `recommendations`, `hasMore`). An answer the
  app does not understand is an error, never an empty list. The error codes
  `forbidden` and `unauthorized` become messages.
- `hooks/useRecommendations.ts`: `useInfiniteQuery` with the key
  `recommendationKeys.all`. It loads the next page while `hasMore` is true.
- Not included yet (#108): the screens, the provider data of each card, and
  invalidating the key when the family profiles or the town change.

## Rules of the calculation

An activity is recommended when **all** of this is true:

- It is `published`, and its provider has an approved profile (like the catalog
  and the search, so a card can always be opened).
- It has not finished: `end_date IS NULL OR end_date >= current_date`. An
  activity that starts in the future is recommended.
- It takes place in the town of the family: `lower(addresses.city) = lower(family_groups.city)`.
  Families do not store a postal code, so only the town is compared.
- It fits **at least one profile**:
  - **Age:** the age is calculated now from `date_of_birth`
    (`age(current_date, date_of_birth)`), never stored. `age_bracket(years)`
    gives the range (`0-3` … `adult`), and the activity fits when its
    `target_age_ranges` contain it or `all_publics`.
  - **Interests:** the category of the activity is one of the interests of the profile.

A profile **without date of birth** or **without interests** fits nothing. The
old `age_range` is not used as a fallback (team decision). Profiles created before
C11 have no date of birth until they are edited, and the function says so with
`recommendations_incomplete_profiles` when that leaves no usable profile.

## Order

1. More profiles that fit it first (`matched_count`).
2. Closest first. Activities without a point go last.
3. Newest first, then `id`, so pages never repeat or skip rows.

## Indexes

No new index. The filters use the ones that exist: `activities_target_age_ranges_idx`
(GIN, for `&&`), `addresses_city_lower_idx` (for `lower(city)`),
`activities_category_idx` and `family_profiles_family_group_id_idx`.

## Files

| File                                                                     | What it does                                                                            |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `supabase/migrations/20261120120000_recommend_activities_for_family.sql` | `age_bracket()` and the new `recommend_activities()` (the first version had no callers) |
| `supabase/tests/recommendations.sql`                                     | SQL tests (rolled back)                                                                 |
| `supabase/functions/recommendations/`                                    | The Edge Function (`handler.ts` logic, `repository.ts` Supabase calls, `index.ts`)      |
| `supabase/functions/tests/recommendations.test.ts`                       | Deno tests of the handler, with fake dependencies                                       |
| `supabase/tests/recommendations_endpoint.sh`                             | Integration test with real sessions (login, JWT, RLS and the SQL function)              |
| `mobile/src/features/recommendations/`                                   | `fetchRecommendations`, `useRecommendations` and their tests                            |

## How to test

1. `npx supabase db reset`
2. `docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/recommendations.sql`
   Every line must start with `ok`. It covers the age ranges and the birthday
   change, interests, town (without case), finished and draft activities,
   providers without an approved profile, order, duplicates, pagination, the
   missing-data errors and that another family or a provider cannot use it.

3. `npx supabase start`, and in another terminal `npx supabase functions serve`,
   then `bash supabase/tests/recommendations_endpoint.sh`. Every line must start
   with `ok`. It creates its own users and data and deletes them at the end. It
   covers 401 and 403, that each family only sees its own matches, pagination,
   the limit, the three missing-data statuses and `NO_MATCHES`.
4. `deno test --allow-env` in `supabase/functions` and
   `npx jest src/features/recommendations` in `mobile`.

## Pending

- #108 shows it in the app (screens, provider data of the cards, invalidating the
  key when the profiles or the town change).
