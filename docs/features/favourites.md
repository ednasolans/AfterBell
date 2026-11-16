# Feature guide: favourites (C9, #116)

Customers save activities in a private list of favourites, to find them later. This guide explains the rules, the API, the screens and the decisions behind them.

## 1. Rules

- Favourites belong to the **customer account**, not to a family profile: changing the active profile does not change them.
- Only **published** activities can be saved. A finished activity that is still published can be saved: it is still in the catalog, marked *Finished*.
- The same activity cannot be saved twice (primary key `(customer_id, activity_id)`). The app treats a second save as a success.
- A customer only reads and removes their own favourites. Providers cannot save favourites.
- When an activity is unpublished, finishes or its provider loses the approved profile, it **stays in the list, marked "Not available"**, instead of disappearing without notice. It cannot be opened (customers cannot read unpublished activities), but it can be removed.

## 2. API

The table `favourites` and its RLS come from C11 (`20261103212854_create_sprint2_tables.sql`). #116 adds `20261110120000_list_favourites.sql`.

| Operation | How | Notes |
|---|---|---|
| Add | `insert` into `favourites` with `activity_id` | `customer_id` defaults to `auth.uid()`. RLS rejects drafts and non-customers. Duplicate → Postgres `23505`. |
| Remove | `delete` from `favourites` where `activity_id` | RLS only deletes the customer's own rows. |
| List | `my_favourites(p_limit?, p_offset?)` | Newest first, up to 100 per page. Returns what the card needs (title, category, type, dates, ages, price, provider name) and `available`. Never the description or the schedule. |
| Is it a favourite? | `select("*, favourites(customer_id)")` in the catalog queries | Same request as the activities: RLS only embeds the customer's own row, so the list is empty or has one row. No extra request per card. |

`available` is true when the activity is published, has not finished and its provider has an approved profile: the same rules as the catalog, so an available favourite always opens.

## 3. App

Favourites are part of the `catalog` feature: the list reuses the catalog card, and features cannot import from each other (AGENTS.md).

| File | What it does |
|---|---|
| `features/catalog/api/addFavourite.ts`, `removeFavourite.ts` | Save and remove; a duplicate is not an error |
| `features/catalog/api/fetchFavourites.ts`, `toFavouriteActivity.ts` | Call `my_favourites` and map its rows |
| `features/catalog/favouriteErrors.ts` | Messages for the family ("This activity can no longer be saved.", or a generic one) |
| `features/catalog/hooks/useFavourites.ts` | The list (`catalogKeys.favourites()`) |
| `features/catalog/hooks/useToggleFavourite.ts` | Optimistic update of the catalog list, the detail and the favourites; rollback and an alert if the request fails |
| `features/catalog/components/FavouriteButton.tsx` | The heart, disabled while its request is on its way |
| `features/catalog/components/CatalogActivityCard.tsx` | Receives only the fields it shows, the heart, and `unavailable` |
| `features/catalog/components/FavouritesList.tsx` | The saved activities, the "Not available" mark and the empty state |
| `app/(customer)/favourites.tsx` | Route **Favourites**, opened from the bottom bar |

The bottom bar item **Saved** (a placeholder) is now **Favourites**, with the same heart as the cards.

## 4. Tests

- `supabase/tests/favourites.sql`: add, duplicates, drafts, other customers, providers, anonymous users, the list (order, pagination, provider name, availability), unpublished activities and removing (21 checks, rolled back). Run it like the other SQL tests:
  `docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/favourites.sql`
- Jest: `catalogApi.test.ts` and `favouritesApi.test.ts` (API), `favouriteErrors.test.ts`, `useToggleFavourite.test.ts` (optimistic update and rollback in the three caches), `CatalogList.test.tsx` and `CatalogActivityDetail.test.tsx` (heart), `FavouritesList.test.tsx` (list, unavailable, empty state, removal and rollback).

## 5. Pending

- `search_activities` (C6) should also say whether each activity is a favourite when the search screen uses it.
- The list loads up to 100 favourites; more pages can be added with `p_offset` if a family ever needs them.
