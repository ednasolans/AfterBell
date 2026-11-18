# Text search (#101, C6)

Customers find published activities by typing a text. This is the base on
which the filters of #102 are added. The "endpoint" is the database function
`search_activities` (called with `supabase.rpc`), and the app wraps it in
`searchActivities` (`features/catalog/api/searchActivities.ts`).

## API: `search_activities`

| Argument                                                                                                            | Meaning                                                                    |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `p_query`                                                                                                           | Text to search. `NULL` or blank: no text filter (every published activity) |
| `p_categories`, `p_age_min`, `p_age_max`, `p_city`, `p_postal_code`, `p_price_min`, `p_price_max`, `p_price_period` | Filters of #102: see [search-filters.md](search-filters.md)                |
| `p_limit`                                                                                                           | Page size: 1–100, default 20                                               |
| `p_offset`                                                                                                          | Rows to skip (`page * p_limit`)                                            |

Returns rows of `activities`, most relevant first. Only the customer's
session can call it (`authenticated`; anonymous users get _permission denied_).

`count_search_activities` takes the same arguments without `p_limit` and
`p_offset` and returns how many activities the search finds across every page
(#103). Both share `search_activity_matches`, which validates the arguments,
applies the filters and computes the relevance, so they always agree.

| Error                    | SQLSTATE | When                       | App message                                   |
| ------------------------ | -------- | -------------------------- | --------------------------------------------- |
| `search_query_too_short` | 22023    | 1 character after trimming | "Type at least 2 characters to search."       |
| `search_query_too_long`  | 22023    | more than 100 characters   | "The search can have at most 100 characters." |

The app checks the same limits before the request (`validateSearchQuery`).
An empty text is **ignored** (browse everything); 1 character is **rejected**.

## Decisions

- **Fields searched:** title, description, category name and provider name.
  Title, description and category are stored in `activities.search_normalized`
  (a trigger keeps it right). The provider name lives in the private technical
  sheet and can change without touching the activity, so it is read when
  searching through `public_provider_contacts()` (the only public view of the
  sheet; the sheet itself is never opened).
- **Case and accents:** the text and the columns go through
  `lower(unaccent(...))`, so "MUSICA" finds "Música".
- **Words:** the text is split in at most 5 words; every word must appear in
  some searched field, in any order ("nens musica" finds "Música per a nens").
- **Relevance:** per word, title 3, category 2, provider name 2, description 1.
  Ties: newest first, then `id` so pages never repeat or skip rows.
- **Published only:** `status = 'published'`, and RLS applies too
  (`SECURITY INVOKER`). Since #103 the provider must also have an approved
  profile (`public_approved_provider_profiles()`), as in the catalog list. Tutor offers are activities with `is_tutor = true`, so
  the published ones are included with no extra rule.
- **Escaping:** the text is always a bound parameter (no SQL injection).
  `%`, `_` and `\` are escaped, so they are searched as plain characters and
  "%%" does not match everything.
- **No typo tolerance** (e.g. "futbal"): only case and accents, as the issue
  asks. Trigram similarity could be added later with the same index.

## Indexes

- `activities_search_trgm_idx` (GIN trigram on `search_normalized`, created in
  C11): serves every `LIKE '%word%'`.
- `activities_published_created_idx` (new, partial on published rows): serves
  the "newest first" order of ties.
- The provider name is not indexed (`unaccent` is not immutable, so it cannot
  be in an index). It is only matched on a small join; revisit if the number of
  providers grows a lot.

## Files

| File                                                                         | What it does                                                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `supabase/migrations/20261116100000_text_search_activities.sql`              | Trigger, indexes and the new `search_activities`                                     |
| `supabase/migrations/20261118120000_count_search_and_approved_providers.sql` | `search_activity_matches`, `count_search_activities`, approved providers only (#103) |
| `supabase/tests/text_search.sql`                                             | SQL tests (rolled back)                                                              |
| `features/catalog/api/searchActivities.ts`                                   | Trim, validate, call the function, map errors and rows                               |
| `features/catalog/api/searchActivities.test.ts`                              | Jest tests of the above                                                              |

## How to test

1. Apply the migration to the Supabase project.
2. Run `supabase/tests/text_search.sql` with `psql` against that database
   (everything is rolled back): every line must start with `ok`. It checks
   accents and case, trimming, several words, provider name, drafts excluded,
   tutor offers included, `%`/`_`/quotes, pagination, ordering, short and long
   texts and anonymous users.
3. In `mobile/`: `npx jest src/features/catalog/api/searchActivities`.

## Search screen (#103)

The search bar is above the activities of the customer home
(`features/catalog/components/CatalogSearch.tsx`):

- **When it searches:** after a pause of 300 ms without typing
  (`useDebouncedValue`), or at once with the keyboard's search key. An empty
  box shows the full catalog list at once; one character shows the "too short"
  message under the bar and keeps the full list.
- **Results:** the same card as the catalog (`CatalogActivityCard`), tutor
  offers included. `searchCatalogActivities` adds the provider and whether the
  activity is a favourite to each row of `search_activities`.
- **Count:** "N activities found" above the results, from
  `count_search_activities` (`useSearchCount`).
- **Pagination:** infinite scroll with `useInfiniteQuery`
  (`useSearchActivities`): the next page is loaded at the end of the list while
  the last page was full (20 rows). The catalog list itself is not paginated.
- **States:** spinner while the first page loads, an error with "Try again",
  a message with a suggestion when nothing is found, and a retry under the list
  when a later page fails.
- **Clear:** the ✕ in the bar empties the text and shows the full list.
- **Keeping the text:** the state lives in the home screen, which stays mounted
  under the activity detail, so the text and results are there on going back.
- **Favourites:** the heart of a result changes at once and is undone if the
  request fails, as in the list (`useToggleFavourite` updates every cached search).

The filter panel (#104) is described in
[search-filters.md](search-filters.md#filter-panel-104).

## Pending

- `search_activities` does not say whether each result is a favourite yet (see `favourites.md`).
