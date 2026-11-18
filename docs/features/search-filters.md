# Search filters (#102, C6)

Customers narrow the activity search by category, age range, city and price.
The filters work on structured data (never on free text), can be used alone
or together, and combine with the text search of #101
([text-search.md](text-search.md)). The "endpoints" are two database
functions called with `supabase.rpc`:

- `search_activities`: the search, now with every filter.
- `available_activity_filters`: the values to build the filters.

Only logged-in users can call them (`authenticated`; anonymous users get
_permission denied_). The filter screen comes in a later issue.

## API: `search_activities`

Every filter is optional: `NULL` means "not applied". All the filters, and the
text when there is one, are combined with **AND**.

| Argument                     | Type      | Meaning                                                                                           |
| ---------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| `p_query`                    | `text`    | Text search (#101)                                                                                |
| `p_categories`               | `text[]`  | One or several names of the category catalogue (`categories.name`). Empty list: no filter         |
| `p_age_min`, `p_age_max`     | `integer` | Requested ages in years. Either one can be left out                                               |
| `p_city`                     | `text`    | City of the activity's address, without case or spaces around. Blank: no filter                   |
| `p_postal_code`              | `text`    | Postal code of the activity's address. Blank: no filter                                           |
| `p_price_min`, `p_price_max` | `numeric` | Price range, limits included. **Needs `p_price_period`**                                          |
| `p_price_period`             | `text`    | `per_hour`, `per_day`, `per_week`, `per_month`, `per_term` or `per_year`. Alone: only that period |
| `p_limit`, `p_offset`        | `integer` | Pagination, as in #101                                                                            |

Call it with named arguments (PostgREST always does). Example from the app:

```ts
await supabase.rpc("search_activities", {
  p_query: "swimming",
  p_categories: ["swimming", "football"],
  p_age_min: 6,
  p_age_max: 9,
  p_city: "Lleida",
  p_price_max: 40,
  p_price_period: "per_month",
});
```

### Errors

Invalid values raise an error with SQLSTATE `22023` and a code as the message.
The app checks the same rules before the request (`validateSearchFilters`),
except whether a category exists, and shows the message of each code
(`SEARCH_ERROR_MESSAGES`).

| Error                          | When                                              | App message                                                  |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------------------ |
| `search_unknown_category`      | A category is not in the catalogue (or is `NULL`) | "One of the selected categories does not exist."             |
| `search_negative_age`          | `p_age_min` or `p_age_max` below 0                | "Ages cannot be negative."                                   |
| `search_invalid_age_range`     | `p_age_min` > `p_age_max`                         | "The minimum age cannot be higher than the maximum age."     |
| `search_negative_price`        | `p_price_min` or `p_price_max` below 0            | "Prices cannot be negative."                                 |
| `search_invalid_price_range`   | `p_price_min` > `p_price_max`                     | "The minimum price cannot be higher than the maximum price." |
| `search_unknown_price_period`  | `p_price_period` is not one of the six periods    | "The price period is not valid."                             |
| `search_price_period_required` | A price limit without `p_price_period`            | "Choose a price period to filter by price."                  |
| `search_query_too_short/long`  | Text of 1 or more than 100 characters (#101)      | See [text-search.md](text-search.md)                         |

## API: `available_activity_filters`

No arguments. Returns one JSON object:

```json
{
  "categories": ["art", "basketball", "dance", "..."],
  "cities": ["Lleida", "Tàrrega"],
  "prices": [
    { "period": "per_hour", "min": 10, "max": 20 },
    { "period": "per_month", "min": 30, "max": 80 }
  ]
}
```

- `categories`: the whole catalogue, by name.
- `cities`: the cities of published activities, sorted, once each whatever
  their case ("Lleida" and "LLEIDA" are one city).
- `prices`: the lowest and highest price of each period that has published
  activities, in the order of the periods (hour to year).

## Decisions

- **Category by catalogue name.** `activities.category` is a foreign key to
  `categories.name`, and names cannot change or be deleted (trigger of C11), so
  the name identifies the catalogue entry. Unknown names are rejected instead
  of returning nothing, so a mistake in the app is visible.
- **Age range by overlap.** Activities store age ranges (`0-3`, `4-6`, `7-9`,
  `10-12`, `13-15`, `16-17`, `adult` = 18 or older, `all_publics`), not exact
  ages. An activity matches when one of its ranges overlaps the requested ages;
  `all_publics` always matches. Ages are whole years, so 17 is not `adult`.
  The requested ages are turned into the list of matching ranges, and the
  activity is compared with `&&` (arrays overlap), which a GIN index serves.
- **City and postal code from the structured address**, compared whole (not as
  part of the text): "Lle" does not find "Lleida". The city ignores case and
  spaces around; accents are not removed (`unaccent` cannot be indexed), so the
  app should offer the cities from `available_activity_filters`.
- **Price only within one period.** Each activity has one price and a period
  (`price_period`). Comparing 20 € per hour with 20 € per year would be wrong,
  and converting between periods needs assumptions we do not have (hours per
  week, weeks per term…). So a price range always comes with a period, and only
  activities of that period are compared. Tutor offers use the same columns
  (usually `per_hour`). There is no "per session" period: adding one is a new
  value of the `price_period` check.
- **Combination:** AND between filters and with the text. Relevance and the
  order of ties are those of #101.
- **Backwards compatibility:** the first seven arguments keep their position
  (only `p_category text` became `p_categories text[]`), so positional calls
  that pass `NULL` as the category still work. The new filters are at the end.

## Indexes

| Index                                   | Serves                                                         |
| --------------------------------------- | -------------------------------------------------------------- |
| `activities_category_idx` (existing)    | `category = ANY (p_categories)`                                |
| `activities_target_age_ranges_idx`      | GIN, `target_age_ranges && <ranges>`                           |
| `addresses_city_lower_idx`              | `lower(city) = <city>` (the plain `addresses_city_idx` cannot) |
| `addresses_postal_code_idx` (existing)  | `postal_code = <code>`                                         |
| `activities_published_period_price_idx` | `price_period` + `price` range, published rows only            |

## Files

| File                                                            | What it does                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `supabase/migrations/20261117120000_filter_activity_search.sql` | New `search_activities`, `available_activity_filters` and indexes  |
| `supabase/tests/filters.sql`                                    | SQL tests (rolled back)                                            |
| `mobile/src/lib/searchFilters.ts`                               | `SearchFilters` type, shared by the catalog and the search summary |
| `features/catalog/api/searchActivities.ts`                      | Validate, send the filters, map errors                             |
| `supabase/functions/summarize-search/*`                         | Accepts the same filters; invalid filters answer 400               |

## How to test

1. `npx supabase db reset` (applies the migration).
2. Run the SQL tests; every line must start with `ok`:
   ```bash
   docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/filters.sql
   docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/text_search.sql
   ```
   They check each filter alone, combined filters, filters with text, invalid
   values, the available values and anonymous users.
3. In `mobile/`: `npx jest src/features/catalog/api/searchActivities src/features/search-summary`.
4. In `supabase/functions/`: `deno test --allow-env`.

## Pending

- The filter screen (UI), in a later issue. The app has no function yet that
  calls `available_activity_filters`; it belongs to that screen.
- `search_activities` returns temporary activities that have already ended
  (predates #102). Since #103 it requires an approved provider profile, like the
  catalog list.
