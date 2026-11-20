# Recommendation logic (#106, C7)

Which activities are suggested to a customer. It is calculated in the database
at the moment of the request, from structured data only (age, interests and
town), never from free text. The function is `recommend_activities` (called with
`supabase.rpc`). The endpoint with pagination, a cache and the app screens belong
to #107 and #108.

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

## Rules

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

## How to test

1. `npx supabase db reset`
2. `docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/recommendations.sql`
   Every line must start with `ok`. It covers the age ranges and the birthday
   change, interests, town (without case), finished and draft activities,
   providers without an approved profile, order, duplicates, pagination, the
   missing-data errors and that another family or a provider cannot use it.

## Pending

- #107 wraps it in the endpoint (pagination, cache, messages for the missing data).
- #108 shows it in the app.
