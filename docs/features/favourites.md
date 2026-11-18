# Feature guide: favourites (C9, #116)

Customers save activities in a private list of favourites, to find them later. This guide explains the rules, the API, the screens and the decisions behind them.

## 1. Rules

- Favourites belong to a **family profile** (since #104; before, to the customer account). Each child has their own list: the catalog, the detail and the Favourites screen show the hearts of the **active profile**, and changing it changes them. Both parents of a family share the favourites of its children.
- Without a family profile there is no heart, and the Favourites screen asks to add a profile.
- Only **published** activities can be saved. A finished activity that is still published can be saved: it is still in the catalog, marked *Finished*.
- The same activity cannot be saved twice for the same profile (primary key `(family_profile_id, activity_id)`). The app treats a second save as a success.
- Only the members of the family read, save and remove the favourites of its profiles (`is_family_profile_member`). Providers cannot save favourites. Deleting a profile deletes its favourites.
- When an activity is unpublished, finishes or its provider loses the approved profile, it **stays in the list, marked "Not available"**, instead of disappearing without notice. It cannot be opened (customers cannot read unpublished activities), but it can be removed.

## 2. API

The table `favourites` and its RLS come from C11 (`20261103212854_create_sprint2_tables.sql`). #116 adds `20261110120000_list_favourites.sql`. `20261118175935_favourites_per_family_profile.sql` (#104) moves them from the account to the family profile.

| Operation | How | Notes |
|---|---|---|
| Add | `insert` into `favourites` with `family_profile_id` and `activity_id` | RLS rejects drafts, profiles of other families and providers. Duplicate → Postgres `23505`. |
| Remove | `delete` from `favourites` where `family_profile_id` and `activity_id` | RLS only deletes rows of the family's profiles. |
| List | `my_favourites(p_family_profile_id, p_limit?, p_offset?)` | Newest first, up to 100 per page. Returns what the card needs (title, category, type, dates, ages, price, provider name) and `available`. Never the description or the schedule. Another family's profile gives no rows. |
| Is it a favourite? | `select("*, favourites(activity_id)")` with `.eq("favourites.family_profile_id", id)` in the catalog queries | Same request as the activities: the embedded list is filtered by the profile, so it is empty or has one row. The search reads the saved ids of its page for the profile. |

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

The catalog gets the active profile from `FavouritesProfileProvider` (`features/catalog/favouritesProfile.tsx`), which the `(customer)` layout fills with the profile of `ActiveProfileProvider`, so `catalog` does not import from `family-profiles`. The query keys of the list, the detail, the searches and the favourites include the profile, so each profile has its own cache and a heart changed for one child does not change the others.

## 4. Tests

- `supabase/tests/favourites.sql`: add, duplicates, one list per child, the second parent, drafts, other families, providers, anonymous users, the list (order, pagination, provider name, availability), unpublished activities, removing and deleting a profile (28 checks, rolled back). Run it like the other SQL tests:
  `docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/favourites.sql`
- Jest: `catalogApi.test.ts` and `favouritesApi.test.ts` (API), `favouriteErrors.test.ts`, `useToggleFavourite.test.ts` (optimistic update and rollback in the three caches), `CatalogList.test.tsx` and `CatalogActivityDetail.test.tsx` (heart), `FavouritesList.test.tsx` (list, unavailable, empty state, removal and rollback).

## 5. Pending

- `search_activities` (C6) should also say whether each activity is a favourite when the search screen uses it.
- The list loads up to 100 favourites; more pages can be added with `p_offset` if a family ever needs them.
