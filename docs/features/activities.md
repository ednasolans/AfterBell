# Feature guide: activity creation and management (issue #32)

This guide explains what was built so that providers can create and manage their whole-year activities, where each piece lives and why it was designed this way. It is meant for team members who need to change or extend the feature and for the teaching staff reviewing the sprint.

> **Issue:** #32 *[C6] Activity creation and management* (Sprint 1, functionality F5), split into three sub-issues:
> - #33 Activities table and RLS
> - #34 Create activity form
> - #35 Provider's activity list with edit and delete
>
> **Later change:** the provider addresses issue added the place where each activity takes place (one of the provider's addresses). The database design is justified in [`docs/decisions/database.md`](../decisions/database.md).

## 1. What the feature does

A provider (`company` account) can:

1. **Create** an activity: title, description, category, target ages, maximum number of participants, place (one of its addresses), weekly schedule, price range and price period.
2. **See its own activities** in a list, newest first, with the address where each one takes place.
3. **Edit** an activity with the same form, filled in with the saved values.
4. **Delete** an activity, after confirming it. Deleting is permanent.

Any logged-in user (families included) can read activities, so families will be able to discover them and sign up. Only the owner can change or delete them.

### Acceptance criteria

| Criterion | Where it is guaranteed |
|---|---|
| A company creates an activity from its account, and it appears in its activity list | `INSERT` policy with `is_company()`; create form and list screen |
| The company can edit and delete its own activities | `UPDATE` and `DELETE` policies (`auth.uid() = provider_id`); edit screen and delete button |
| Another company cannot modify or delete those activities | The same policies, verified with SQL tests; the app also detects "0 rows changed" and reports an error |

## 2. Design decisions

### Data model

| Decision | Alternatives considered | Why |
|---|---|---|
| **Ages, schedule and prices belong to each activity** and were removed from the technical sheet | Keeping them in both tables | A provider offers activities with different ages, times and prices; keeping them in the sheet would duplicate data. Done with a new migration (`ALTER TABLE … DROP COLUMN`), because the sheet migration was already in `main`. |
| **`category`: one value** from the shared list of activity categories | Free text / several categories | A specific activity ("Swimming for kids") has one category. Added now, although filters arrive in Sprint 2, to avoid a data migration later. |
| **`type`: `whole_year` or `event`**, default `whole_year`, not editable | No type column | Sprint 1 only has whole-year activities; events come later. Changing the type would change the nature of the activity. |
| **One price** (`price`) **and period** (`per_month`, `per_term`…) as `NUMERIC(8, 2)` | A price range | The activity now has one published price; the period keeps its meaning clear and the numeric type stores cents. |
| **Schedule as a `JSONB` list** of `{ day, startTime, endTime }` | A separate `time_slots` table / a text list | One insert saves the whole activity; it matches the app type `TimeSlot`; it can still be queried by day later. The app validates each slot. |
| **`max_participants`: required whole number between 1 and 1000**, editable by the owner | Optional / no upper limit | Every activity has a capacity the provider must think about; the upper limit catches typing mistakes (10000 instead of 100). Added with its own migration and its own column-level `GRANT UPDATE` (new columns are not covered by the earlier grant). |
| **The number of enrolled people is not stored** | An `enrolled_count` column | Enrollments do not exist yet, so nothing would update it, and a stored counter can drift from reality. It will be computed by counting enrollments (view or function) in the enrollments issue, which will also prevent enrolling when an activity is full. |
| **Each activity takes place at one of the provider's addresses** (`address_id`, required) | Free text address per activity / the sheet's address for every activity | A provider can teach in several places. The addresses are entered once in the technical sheet and chosen here, so they are not typed again. A **composite foreign key** `(address_id, provider_id)` makes the database reject another provider's address. |
| **UUID ids** and `provider_id DEFAULT auth.uid()` | Integer ids (as drawn in the diagram tool, which has no UUID type) | Supabase user ids are UUIDs and every RLS policy compares them with `auth.uid()`. |

### Security

| Decision | Why |
|---|---|
| **Any logged-in user can read activities** (`USING (true)`, team decision) | Families need to see them to sign up. Users without a session (`anon`) cannot read them. |
| **Only `company` accounts can create**, and only for themselves | `WITH CHECK (auth.uid() = provider_id AND is_company())`. |
| **Owner-only update and delete** | `USING (auth.uid() = provider_id)`. |
| **Permanent delete** (team decision) | Simpler than a soft delete for Sprint 1. Needs both a `DELETE` policy and `GRANT DELETE`. |
| **Column-level `UPDATE` privileges** | `id`, `provider_id`, `type` and `created_at` cannot be changed, even by the owner. |
| The app checks that an update/delete **changed one row** | RLS does not raise an error for someone else's row: it changes 0 rows. Without this check the app would say "saved" when nothing was saved. |

### App architecture

| Decision | Why |
|---|---|
| **TanStack Query** for server data (team decision) | First feature that reads lists. It gives loading/error states, caching, retries, refetch when the app returns to the foreground, and refreshes every list after a change with one `invalidateQueries`. |
| **Form state separated from saving** (`useActivityForm` + `useCreateActivity` / `useUpdateActivity`) | The same `ActivityForm` component serves **create and edit**; editing needed no new form code. |
| **Shared code moved to `lib/` and `components/`** (schedule, prices, categories, `ScheduleEditor`, `PriceField`, `FormSubmit`…) | Features must not import from each other, and duplicated code breaks the SonarQube duplication limit (3%). |
| **Two types:** `ActivityForm` (being filled in, with `null` for "not chosen") and `Activity` (saved, always complete) | TypeScript knows in each place what is guaranteed; the list never has to check for missing values. |
| **Every data screen handles four states:** loading, error with retry, empty and data | New providers have no activities, and mobile networks fail often. |
| **The address selector handles its own states** (loading, error with retry, no addresses) | A provider without a technical sheet has no addresses: the selector tells it to add them there, and the rest of the form can still be filled in. |
| **The list shows the address from the cached addresses**, not from the activities query | The form already loads the provider's addresses (`useMyAddresses`), so the list reuses the same cache. If the addresses fail, the cards are shown without the address instead of an error. Embedding the address in the activities query is possible later. |
| **Addresses have their own query key** (`["addresses", "mine"]`), outside `activityKeys` | They belong to the provider, not to an activity; invalidating the activities does not need to reload them. |
| **Confirmation before deleting** | The delete is permanent. |

## 3. Files

### Database (`supabase/migrations/`)

| File | Content |
|---|---|
| `…_create_activities.sql` | `activities` table with `CHECK` constraints mirroring the app validation and length limits; index on `provider_id`; RLS (read for every logged-in user, create for companies, update/delete for the owner); privileges. |
| `…_remove_activity_fields_from_technical_sheets.sql` | Removes ages, schedule and prices from `technical_sheets`. |
| `…_add_max_participants_to_activities.sql` | Adds the required `max_participants` column (1–1000) and lets owners update it. |
| `…_validate_activity_schedule_slots.sql` | `is_valid_schedule()`: every slot has a valid day and `HH:MM` times, with the start before the end. |
| `…_create_addresses.sql` | `addresses` table of the providers (see [`technical-sheet.md`](technical-sheet.md)). |
| `…_use_addresses_in_technical_sheets_and_activities.sql` | Adds the required `address_id` with the composite foreign key; existing activities take the main address of their provider; lets owners update it. |
| `…_use_single_activity_price.sql` | Replaces the activity price range with one `price`; existing rows keep the former lower price. |

`mobile/src/lib/database.types.ts` was regenerated from these migrations.

### App: feature (`mobile/src/features/activities/`)

| File | Content |
|---|---|
| `types.ts` | `ACTIVITY_TYPES`; `ActivityForm` (form values, with `addressId`); `EMPTY_ACTIVITY_FORM`; `Activity` (saved activity). |
| `validation.ts` | `validateActivity`, split into details, place, schedule and prices; limits exported as constants (`TITLE_MAX_LENGTH`, `DESCRIPTION_MAX_LENGTH`, `MAX_PARTICIPANTS`) matching the database. |
| `api/toActivityInsert.ts` | Form → database row (used to create and to update). Does not send `provider_id` or `type`. |
| `api/toActivity.ts` | Database row → `Activity`, and `Activity` → form values (to edit). |
| `api/createActivity.ts` | Inserts an activity. |
| `api/fetchMyActivities.ts` | Activities of the logged-in provider, newest first (filters by `provider_id`, because RLS lets everyone read all activities). |
| `api/fetchMyAddresses.ts` | Addresses of the logged-in provider, main address first (filters by `provider_id`, because RLS lets everyone read all addresses). |
| `api/fetchActivity.ts` | One activity by id (edit screen). |
| `api/updateActivity.ts` | Updates an activity; throws if no row changed. |
| `api/deleteActivity.ts` | Deletes an activity; throws if no row was deleted. |
| `hooks/activityKeys.ts` | Query keys: `all`, `mine()`, `detail(id)`. Every key starts with `"activities"`, so invalidating `all` refreshes everything. |
| `hooks/useActivityForm.ts` | Form state and validation; receives `initialForm` and `onSubmit`, so it works for create and edit. |
| `hooks/useMyActivities.ts`, `useActivity.ts` | Queries (`useQuery`). |
| `hooks/useMyAddresses.ts` | Query of the provider's addresses, with its key `myAddressesKey`. |
| `hooks/useCreateActivity.ts`, `useUpdateActivity.ts`, `useDeleteActivity.ts` | Mutations (`useMutation`); refresh the activity queries on success. |
| `components/ActivityForm.tsx` | The form: details, place, schedule and prices sections, and `FormSubmit`. |
| `components/AddressSelect.tsx` | Chooses one of the provider's addresses; shows loading, error with retry, and "add your addresses in your technical sheet" when there are none. |
| `components/ActivityCard.tsx` | One activity in the list: title, category, address, schedule, price, maximum participants ("Up to 12 people"), Edit and Delete. |
| `components/MyActivitiesList.tsx` | The list with its four states, the "New activity" button and delete with confirmation. |
| `components/EditActivity.tsx` | Loads an activity and shows `ActivityForm` filled in. |

### App: routes (`mobile/src/app/(provider)/`)

| File | URL | Content |
|---|---|---|
| `activities/index.tsx` | `/activities` | My activities |
| `activities/new.tsx` | `/activities/new` | Create an activity |
| `activities/[id]/edit.tsx` | `/activities/<id>/edit` | Edit an activity |
| `provider-home.tsx` | `/provider-home` | Link to "My activities" |

Screens only connect a feature component with a hook and decide where to go after saving.

### App: shared code (`mobile/src/`)

| File | Content |
|---|---|
| `lib/schedule.ts` | Week days, `TimeSlot`, time and slot validation, sorting, formatting (moved from the technical sheet). |
| `lib/price.ts` | Price periods, `parsePrice`, and `formatPrice` ("30 € per month"). |
| `lib/numbers.ts` | `parseInteger` (whole numbers typed by the user). |
| `lib/activityCategories.ts` | Activity categories and labels. |
| `lib/text.ts` | `emptyToNull`. |
| `lib/addresses.ts` | `Address` type and `formatAddress` (shared with the technical sheet). |
| `lib/validation.ts` | `isBlank` and `hasErrors` (moved here to be shared). |
| `lib/queryClient.ts` | The TanStack Query client and the foreground refetch. |
| `components/ScheduleEditor.tsx`, `PriceField.tsx` | Moved from the technical sheet to be shared. |
| `components/NumberField.tsx` | Number input that keeps the typed text and sends the parsed number; receives the parser as a prop. `PriceField` is a `NumberField` with `parsePrice`; the participants field uses `parseInteger`. |
| `components/FormSubmit.tsx` | Save button and error messages shared by every form. |
| `components/LoadingView.tsx`, `ErrorView.tsx` | Loading and error-with-retry screens. |
| `components/TextField.tsx` | Now supports multiline text (description) and passes `autoCapitalize` (it was ignored before). |
| `test-utils/queryClientWrapper.tsx` | Test `QueryClient` (no retries, no cache timers) and its provider wrapper. |
| `test-utils/supabaseQueryMock.ts` | Fake chainable Supabase query for `api/` tests. |
| `test-utils/activityFixtures.ts` | A saved activity shared by the tests. |

### New dependency

- `@tanstack/react-query` (no native code; works in Expo Go).

## 4. How to test it

**Automated:** `npm test` in `mobile/` (241 tests in the whole app). Every new file with logic is at 100% coverage: validation, mappers, API functions (Supabase mocked), hooks (with a test `QueryClient`) and components (full create flow with the place, edit, list states with and without addresses, delete with confirmation, and the address selector states).

**Database (SQL Editor, impersonating two companies and one family)** — see *Testing RLS* in `mobile/AGENTS.md`:

| # | Test | Expected | Criterion |
|---|---|---|---|
| 1 | A family creates an activity | RLS violation | 1 |
| 2 | Club A creates an activity | Inserted; `type = whole_year`; `provider_id` = club A | 1 |
| 3 | Club A lists its activities | The activity appears | 1 |
| 4 | Club A edits its activity | `UPDATE 1` | 2 |
| 5 | Club A changes the owner | Permission denied | 2 |
| 6 | Club A deletes its activity | `DELETE 1` | 2 |
| 7 | Club B edits club A's activity | `UPDATE 0` | 3 |
| 8 | Club B deletes club A's activity | `DELETE 0` | 3 |
| 9 | A family reads activities | The activity appears | — |
| 10 | `anon` reads activities | Permission denied | — |
| 12 | A technical sheet without the removed columns | Inserted | — |
| 13 | Club A creates an activity with `max_participants = 12` | Inserted | 1 |
| 14 | `max_participants = 0` | `max_participants` check violation | — |
| 15 | Club A changes `max_participants` of its activity | `UPDATE 1` (column-level grant works) | 2 |
| 16 | Club B creates an activity at club A's address | `activities_address_fkey` violation | 3 |
| 17 | Club A creates an activity without `address_id` | Not-null violation | — |
| 18 | Club A moves its activity to another of its addresses | `UPDATE 1` | 2 |
| 19 | Existing activities after the migration | Each one has the main address of its provider | — |

All of them passed.

**App:** in Expo Go, save a technical sheet with two addresses, then *Provider → My activities → New activity*, choose the second address and check that the card shows it. Without login the list shows the error screen (fetching needs a user) and saving fails: this is expected and shows that RLS is enforced.

## 5. Known limitations and pending work

- [ ] **End-to-end test on a phone once login works:** a `company` user creates, edits and deletes an activity, and a `customer` user cannot.
- [ ] The `(provider)` layout must block customers (auth issue).
- [ ] Enrollments: count enrolled people per activity and block enrolling when `max_participants` is reached (enrollments issue).
- [ ] Families' activity browsing and filters by category and city (Sprint 2). Families will need the address of each activity: read it in the same query (`addresses(...)`) or with a view.
- [ ] Events (`type = 'event'`) and their own form.