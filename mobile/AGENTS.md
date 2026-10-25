# AfterBell

AfterBell is a mobile marketplace of local activities. Families and adults discover and request activities, events and private tutors; providers (clubs, schools, academies, tutors and shops) publish their offer. AI generates each provider's public profile from a structured technical sheet and, later, recommends activities and summarises searches.

This is a university group project (MEINF, Universitat de Lleida) developed in sprints. The sprint plan, functionalities (F1–F14) and decisions are in `docs/`. Feature guides (what was built, where it lives and why) are in `docs/features/`. Technical decisions are in `docs/decisions/`; **read [`docs/decisions/database.md`](../docs/decisions/database.md) before creating or changing a table**: it has the schema diagram and the reasons behind it.

This file is the single source of rules for people and AI tools working on the repository. It lives in `mobile/` because most of the work happens there, but the database, security, quality and Git rules apply to the whole repository.

## Repository structure

```
mobile/      React Native app (Expo + TypeScript). This file: mobile/AGENTS.md
supabase/    Backend: migrations, Edge Functions, seed data
scripts/     Project management scripts (burndown, Gantt, EVM). Python
docs/        Sprint deliveries, technical decisions and feature guides
.github/     CI workflows (lint, tests, SonarQube)
```

## Stack

- **App:** React Native with Expo, Expo Router, TypeScript (strict), TanStack Query.
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions in TypeScript).
- **AI:** an external LLM API, called **only** from Supabase Edge Functions.
- **Tests:** Jest with the `jest-expo` preset and React Native Testing Library v14.
- **Quality:** SonarQube Cloud on every pull request. Prettier for formatting.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved or removed. Before writing any code that touches an Expo or React Native API:

1. Read the major version of the `expo` package in `mobile/package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch `https://docs.expo.dev/llms.txt` and follow its links. Never answer from memory.

The same applies to React Native Testing Library: the project uses **v14**, where `render`, `renderHook`, `act` and `fireEvent` are **async**. Most examples online are for v13.

## Commands

This project uses **npm**. App commands run from `mobile/`; Supabase commands run from the repository root. If `npx tsc` prints "This is not the tsc command you are looking for", you are in the wrong folder.

```
# mobile/
npx expo install <package>                 # ALWAYS instead of npm install: SDK-compatible versions
npx expo install <package> -- --save-dev   # same, for test or tooling dependencies
npx expo start                             # dev server (also regenerates typed routes)
npx expo start -c                          # same, clearing Metro's cache (after changing .env or moving files)
npm run lint                               # lint
npx tsc --noEmit                           # type check
npm test                                   # tests
npm run test:coverage                      # tests with coverage report
npx prettier --write <files>               # format only the files you changed
npx expo install --check                   # packages that do not match the Expo SDK
npx expo install --fix                     # fix incompatible package versions

# repository root
npx supabase start                         # local Supabase (Docker)
npx supabase db reset                      # recreate the local DB from all migrations + seed.sql
npx supabase migration new <name>          # new migration file
npx supabase gen types typescript --local > mobile/src/lib/database.types.ts
```

Run lint, type check and tests before declaring any task done.

- Never run `npm audit fix --force`: it installs versions that break the Expo SDK.
- Do not run `npm run format` on the whole project in a feature branch: it reformats teammates' files and creates conflicts. Format only the files you changed.

## App folder structure

```
mobile/src/
├── app/            Routes (Expo Router). Every file is a screen; _layout.tsx files define navigators
│   ├── (auth)/         Login and sign-up
│   ├── (customer)/     Customer area (families and adults)
│   └── (provider)/     Provider area (clubs, schools, tutors, shops)
├── features/       One folder per functionality, named in kebab-case (e.g. technical-sheet, activities)
│   └── <feature>/
│       ├── api/            Supabase calls and camelCase ↔ snake_case mappers (the only code that talks to the database)
│       ├── components/     UI of this feature
│       ├── hooks/          Form state and TanStack Query hooks
│       ├── types.ts        Data types and value lists of this feature
│       └── validation.ts   Pure validation functions
├── components/     Reusable UI shared by several features (TextField, Select, MultiSelect, ScheduleEditor,
│                   PriceField, AddressesEditor, FormSubmit, LoadingView, ErrorView…)
├── lib/            Shared non-UI code: Supabase client, generated DB types, query client,
│                   shared value lists and helpers (ages, activityCategories, addresses, schedule, price, text, validation)
├── test-utils/     Helpers used only by tests (excluded from coverage)
└── theme/          Colours, typography and spacing
```

Every `.ts`/`.tsx` file with logic has a test next to it (`schedule.ts` → `schedule.test.ts`, `PriceField.tsx` → `PriceField.test.tsx`), named after the file it tests. Use `.tsx` only for files that contain JSX.

### Rules

- **Screens in `src/app/` are thin:** they connect a feature component to a hook and decide what happens after an action (`router.back()`, `router.push(...)`). No business logic, validation or Supabase calls in screens (they are excluded from test coverage).
- **Features do not import from other features.** If two features need the same code, move it to `src/lib/` (logic, data) or `src/components/` (UI) with `git mv`. Shared code never imports from `src/features/`.
- **Something used by one feature lives inside that feature;** move it when a second feature needs it.
- **One source of truth for value lists:** `as const` arrays with the derived type and a `Record` of labels:
  ```ts
  export const PRICE_PERIODS = ["per_hour", "per_month"] as const;
  export type PricePeriod = (typeof PRICE_PERIODS)[number];
  export const PRICE_PERIOD_LABELS: Record<PricePeriod, string> = { ... };
  ```
  Values are `snake_case` and match the database `CHECK` constraints exactly; labels are only for display. Each shared list has its own file in `lib/` (`ages.ts`, `activityCategories.ts`, `price.ts`, `schedule.ts`).
- Represent "no value yet" with `null` (never with a valid value such as `0`), and empty text with `''`.
- Import types with `import { type X }`. Use the `@/` alias (`@/lib/...`, `@/components/...`) instead of long relative paths. Use named exports everywhere except route screens (`export default`).

## Navigation

- Use **Expo Router**. Import `Link`, `router` and `useLocalSearchParams` from `expo-router`.
- **Route groups in parentheses are not part of the URL:** `app/(provider)/activities/new.tsx` is `/activities/new`.
- **Dynamic segments** use brackets: `app/(provider)/activities/[id]/edit.tsx`. Read the parameter with `useLocalSearchParams<{ id: string }>()` and navigate with the object form: `router.push({ pathname: "/activities/[id]/edit", params: { id } })`.
- Routes are **typed**. The types are generated in `.expo/types/` when the dev server starts and are not committed. After creating, renaming or pulling route files, run `npx expo start` once and restart the TS Server in the editor before trusting `tsc`.
- The `(customer)` and `(provider)` layouts check the account type; a customer must never reach a provider screen, and vice versa.

## Data and state

### Server data: TanStack Query

- One `QueryClient` for the whole app (`src/lib/queryClient.ts`), provided in the root `_layout.tsx`. It also tells TanStack Query when the app returns to the foreground (`AppState` → `focusManager`).
- **Query keys** of each feature live in one object (`hooks/<feature>Keys.ts`) and form a hierarchy. Data that does not belong to the feature gets its own root key next to its hook (e.g. `myAddressesKey = ["addresses", "mine"]` in `useMyAddresses.ts`), so invalidating `activityKeys.all` does not reload it:
  ```ts
  export const activityKeys = {
    all: ["activities"] as const,
    mine: () => [...activityKeys.all, "mine"] as const,
    detail: (id: string) => [...activityKeys.all, "detail", id] as const,
  };
  ```
- **Reading:** one `useQuery` hook per query (`useMyActivities`, `useActivity(id)`). Use an arrow function when the query needs arguments: `queryFn: () => fetchActivity(id)`.
- **Writing:** one `useMutation` hook per operation (`useCreateActivity`, `useUpdateActivity`, `useDeleteActivity`). Invalidate the feature's root key **in `onSuccess`** (not `onSettled`), so every list and detail is refreshed only when the change succeeded.
- `mutationFn` receives **one** argument: functions that need several values take an object (`updateActivity({ id, form })`).
- Use the states that TanStack Query provides (`isPending`, `isError`, `variables`, `refetch`) instead of copying them into `useState`.
- Every screen that loads data handles four states: loading (`LoadingView`), error with retry (`ErrorView` + `refetch`), empty, and data. A field that loads its own options (e.g. `AddressSelect`) handles the same states inline, so a failure does not block the whole form.

### API layer (`api/`)

- Each operation is one function (`createActivity`, `fetchMyActivities`, `updateActivity`, `deleteActivity`). Hooks and components only know that function, never Supabase.
- **Write mappers** (`toXInsert`): form → row. `camelCase` → `snake_case`, trimmed text, empty optional text → `null` (`emptyToNull` in `lib/text.ts`). Owner ids and columns with database defaults (`provider_id`, `type`) are not sent. A `null` guard at the start narrows the types and throws if the form was not validated.
- **Read mappers** (`toX`, `toXForm`): row → app type, and app type → form values to edit it. Generated types only know that a column is `string`; casting with `as` to our value-list types is allowed **only in read mappers**, because the table's `CHECK` constraints guarantee the values. `Json` columns need `as unknown as`.
- An `interface` is not assignable to the generic `Json` type: copy nested values into plain objects before saving (`schedule.map(({ day, startTime, endTime }) => ({ day, startTime, endTime }))`).
- Supabase **returns** errors instead of throwing them: always check `error` and `throw new Error(error.message)`.
- **`update` and `delete` must check that a row changed.** RLS does not fail when the row belongs to someone else: it changes 0 rows and returns no error. Add `.select("id")` and throw when `data.length === 0`.
- If RLS lets users read more rows than a screen needs (e.g. every logged-in user can read all activities), filter in the query (`.eq("provider_id", user.id)`). This is a filter, not a security measure.
- **Saving rows in several tables** (e.g. addresses and then the technical sheet) cannot be one transaction from the app. Insert the parent rows first, and if a later step fails, delete the rows you created before throwing (see `saveTechnicalSheet`). When the order of returned ids matters, insert that row on its own: a multiple insert does not guarantee the order of the returned rows. If this becomes common, move the save to a database function called with `supabase.rpc`.

### Forms

- **Form state lives in a hook** (`use<Feature>Form`) with a generic `updateField<K extends keyof Form>(field, value)`.
- **Separate form state from saving.** The form hook receives `initialForm` (empty to create, saved values to edit) and `onSubmit` (a function that throws on failure), so the same form component serves both create and edit. The screen or a feature component passes `mutation.mutateAsync`, `mutation.isPending` and `mutation.isError`.
- **UI state and drafts live in the component** with `useState`: whether a modal is open, text still being typed (`'30,'` in a price field), a time slot not added yet.
- **Inputs are controlled:** they receive `value` and report changes through `onChange`/`onChangeText`.
- **If a value can be computed from props or state, compute it during render; do not store it in state** (e.g. `errors`, `canAdd`).
- **Errors are shown after the first save attempt** and then update while typing: `const errors = submitted ? validate(form) : {}`.
- **`submit` validates the current form directly.** Never read `errors` inside `submit`: `setSubmitted(true)` only takes effect on the next render.
- The app validation mirrors the database rules, including **length limits** (export them as constants, e.g. `TITLE_MAX_LENGTH`), so users see a clear message instead of a generic save error.
- Every form uses `FormSubmit` (error summary, save error, button with spinner, disabled while saving).
- Ask for confirmation (`Alert.alert` with a `destructive` button) before permanent actions such as deleting.

### Accessibility

Accessibility is required, and it is also what the tests use to find elements:

- Inputs have `accessibilityLabel={label}` (done in `TextField`).
- Pressables have `accessibilityRole` (`button`, `radio`, `checkbox`) and, when relevant, `accessibilityState` (`disabled`, `selected`, `checked`, `busy`).
- Buttons whose content can change (e.g. a spinner) and icon-only buttons have an `accessibilityLabel` (e.g. `Delete Swimming for kids`). Small touch targets use `hitSlop`.
- Section titles have `accessibilityRole="header"`.

## Tests

- **Pure functions:** one test per rule, starting from a valid base object and changing one field (`{ ...VALID, title: "" }`). Include a passing and a failing case for each rule, test **boundary values** (exactly at a length limit and one more), and check that functions do not mutate their input.
- **Hooks:** `const { result } = await renderHook(() => useX(), { wrapper })`; every state change inside `await act(...)`; always read `result.current` after the `act`.
- **Components:** `await render(<X />)`, `await fireEvent.press(...)` / `await fireEvent.changeText(...)`. Use `findBy...` or `waitFor` for asynchronous results.
- **Find elements as a user would:** `getByRole("button", { name: "Save" })`, `getByRole("header", { name: ... })`, `getByLabelText`, `getByPlaceholderText`, `getByText`. Use `queryBy...` to check that something is **not** on the screen, `getAllBy...` when several elements match, and a regular expression (`{ name: /^Pear/ }`) when the accessible name also includes an icon.
- **Mock the layer below:** component and hook tests mock `api/` functions with `jest.mock`; `api/` tests mock `@/lib/supabase`. Tests never need a database or real environment variables.
- **TanStack Query in tests:** wrap with `createQueryClientWrapper(createTestQueryClient())` from `src/test-utils/queryClientWrapper.tsx`. The test client disables retries and uses `gcTime: Infinity`; without it, cache timers keep Jest running after the tests finish.
- **Failing mutations:** start them with `mutate` inside `act` and wait for `isError` with `waitFor`. Awaiting a rejected `mutateAsync` inside `act` leaves a state update outside `act` and prints a warning.
- `mutationFn` is called with a second, internal argument: assert with `toHaveBeenCalledWith(value, expect.anything())`.
- Chained Supabase queries are mocked with `createQueryBuilderMock(result)` from `src/test-utils/supabaseQueryMock.ts`.
- Shared test data lives in `src/test-utils/` (e.g. `activityFixtures.ts`). Shared components are tested with made-up data, not with values of a feature.
- `Alert.alert` is replaced with `jest.spyOn(Alert, "alert")`; press its buttons by reading the third argument of the call.
- The default test timeout is 15 s (`testTimeout` in `package.json`): the first render of components with icons can take more than 5 s on a cold run.
- When a query fails, read the printed tree (or call `screen.debug()`): it shows the texts, roles and labels the test can see. Timeouts (`Exceeded timeout`) usually come from the environment; wrong values (`Expected… Received…`) usually come from the code.

## Database (Supabase)

### Migrations

- **Every schema change is a migration** in `supabase/migrations/`. Never change tables from the Supabase dashboard.
- **Never edit a migration that has already been applied** by a teammate or on the remote project (in practice: once it is in `main`). Create a new migration, e.g. `ALTER TABLE ... DROP COLUMN ...` to move data to another table.
- One migration per change, named after what it does (`create_activities`, `remove_activity_fields_from_technical_sheets`). Comments explain **why**.
- Migrations run in timestamp order: a migration can only use tables and functions created by earlier ones (e.g. `is_company()` is created in `create_accounts`).
- **After changing the schema, regenerate the TypeScript types** (command above) and run `npx tsc --noEmit`: the compiler lists every place in the app that must change. Never edit `database.types.ts` by hand. If it has a merge conflict, take either side and regenerate it.
- Database names use `snake_case`; app code uses `camelCase`. The `api/` layer converts between them.

### Table design

- Use `UUID` ids (`DEFAULT gen_random_uuid()`); user ids come from `auth.users` and are always UUIDs.
- **Owner columns default to the logged-in user:** `provider_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.accounts(id) ON DELETE CASCADE`. The app never sends the owner id.
- **`CHECK` constraints mirror the app validation:** required text not blank (`btrim(x) <> ''`), allowed values (`IN (...)` or `<@ ARRAY[...]::TEXT[]`), non-empty lists (`cardinality(x) > 0`), and rules across columns as named constraints. Constraint names are unique **per schema**, not per table (`activity_price_range_is_valid`, not another `price_range_is_valid`).
- **Limit the length of every free-text column** (`char_length(x) <= N`), especially text that will be sent to the LLM.
- Optional values are stored as `NULL`, never as `''`.
- Money uses `NUMERIC(8, 2)`, never `FLOAT`.
- Small nested lists that are always read and written together (e.g. a schedule) can be a `JSONB` column with a `jsonb_typeof(x) = 'array'` check.
- Do not duplicate data between tables: each fact lives in one table (e.g. ages, schedule and prices belong to each activity, not to the technical sheet).
- Add an index on every foreign key used by RLS policies or joins (e.g. `provider_id`, `address_id`). Do not add indexes until a query needs them.
- **When a row must point to another row of the same owner**, use a composite foreign key: `FOREIGN KEY (address_id, provider_id) REFERENCES addresses (id, provider_id)`, with `UNIQUE (id, provider_id)` in the referenced table. A simple foreign key would let a provider use another provider's address, because addresses are readable by everyone.
- Choose `ON DELETE` on purpose: `CASCADE` for rows that cannot exist without their owner (`provider_id → accounts`); the default `NO ACTION` when deleting must be blocked while the row is in use (an address used by an activity).
- Adding a value to a list means a new migration that drops and re-creates the `CHECK` constraint with the same name, and adding the value to the `as const` list in the app.
- Every new column needs its own `GRANT UPDATE (column)` if owners may change it: earlier grants only cover the columns that existed then.
- No `updated_at` columns until a feature needs them (they need a trigger to stay right).

### Row-Level Security and privileges

Every table has **two layers**, both in the migration that creates it:

1. **Privileges (which operations and columns):** start with `REVOKE ALL ON TABLE ... FROM PUBLIC, anon, authenticated;` and grant only what is needed. Grant `UPDATE` on a **column list** that excludes ids, owner columns, creation dates and columns that must not change (e.g. an activity's `type`). A `DELETE` policy also needs `GRANT DELETE`.
2. **RLS (which rows):** `ENABLE ROW LEVEL SECURITY` and one policy per allowed operation:
   - `USING` decides which existing rows can be read, changed or deleted; `WITH CHECK` decides which rows can be written. `UPDATE` policies need both; `DELETE` policies only `USING`.
   - Write `(SELECT auth.uid())` and `(SELECT public.is_company())` inside parentheses, so they are evaluated once per query.
   - Use `is_company()` to restrict provider-only operations.
   - Public catalogue data that every logged-in user may see uses `FOR SELECT TO authenticated USING (true)` (e.g. activities). Private data is owner-only (e.g. technical sheets).
   - No policy means no access: add `DELETE` only when the product needs it.
   - Start closed. Opening access later is a new policy; closing it after release means data has already leaked.

### Testing RLS

Test every policy by impersonating users in the SQL Editor (or `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres`):

```sql
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT id FROM public.accounts WHERE email = 'club-a@test.com'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
-- statement to test
ROLLBACK;
```

- Call `set_config` before `SET LOCAL ROLE` (the lookup in `accounts` needs admin rights). Use `SET LOCAL ROLE anon` for users without a session.
- Use at least **two provider accounts and one customer account**, so you can prove that one provider cannot change another provider's rows.
- Check that allowed operations succeed **and** that forbidden ones fail. Remember that a forbidden `UPDATE`/`DELETE` shows `UPDATE 0`/`DELETE 0`, not an error.
- `db reset` deletes the users. Create them again with SQL (faster than Studio); the `handle_new_user` trigger creates their `accounts` row with the account type:
  ```sql
  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
  (gen_random_uuid(), 'club-a@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'club-b@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'family@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated');
  ```
  These users cannot log in from the app (they have no password); use Studio when you need to log in.
- The SQL Editor only shows the result of the **last statement that returns rows**: add `RETURNING ...` to an `INSERT`/`UPDATE`/`DELETE` to see what it did. A statement without an error and without rows succeeded; "No rows returned" after an `UPDATE ... RETURNING id` means nothing was changed.
- Data that later tests need (e.g. club A's address) is created in its own transaction ending in `COMMIT`; the tests themselves end in `ROLLBACK`.
- Record the tests and their results in the pull request.

### Tables planned for other issues

The design and its reasons are in [`docs/decisions/database.md`](../docs/decisions/database.md) (status: proposed). Whoever implements them may adjust the details, but must update that document and its diagram in the same pull request. Follow the table template above (UUID id, `CHECK`s, `REVOKE ALL` + `GRANT`, RLS, index, SQL tests).

**Family groups** (`family_groups`, `family_group_members`)
- Two parents' accounts share one group and its children. **An account belongs to at most one group:** make `account_id` the primary key of `family_group_members` (`REFERENCES accounts (id) ON DELETE CASCADE`), with `family_group_id REFERENCES family_groups (id) ON DELETE CASCADE`.
- Only `customer` accounts can be members: check it in the trigger and in the policies (`NOT (SELECT public.is_company())`).
- Create the group and the membership **automatically** for every new customer account, with a new trigger on `public.accounts` (`AFTER INSERT`, `SECURITY DEFINER`, `SET search_path = ''`). Do not edit `handle_new_user` in its old migration.
- Policies that check membership must call a `SECURITY DEFINER` helper, e.g. `public.is_family_member(group_id UUID) RETURNS BOOLEAN`. A policy on `family_group_members` that queries `family_group_members` fails with *infinite recursion*.
- Joining another parent's group (invitations) is a later feature.

**Family profiles** (`family_profiles`)
- They describe **minors**: store the minimum. `family_group_id` (FK, `ON DELETE CASCADE`), `first_name` (not blank, max 50), `age_range` (one of `AGE_RANGES` in `lib/ages.ts`), `interests` (`TEXT[]` of activity categories, `<@ ARRAY[...]`). Never birth dates, photos or full names.
- Read, create, update and delete only for members of the group. Nobody else, providers included, can read them.
- New table, created directly (there is no old data to migrate).

**Provider profiles** (`provider_profiles`, AI issue)
- Written only by an Edge Function with the secret key (it bypasses RLS), so there is no `INSERT`/`UPDATE` policy for `authenticated`. The LLM key never reaches the app.
- Decide the `status` values (e.g. `draft`, `published`) and the uniqueness (e.g. one published profile per provider: `CREATE UNIQUE INDEX ... ON public.provider_profiles (provider_id) WHERE status = 'published'`).
- Families read published profiles; the owner reads its own.
- Activities keep pointing to `provider_id`: do **not** add `provider_profile_id` to activities.
- The technical sheet fields sent to the LLM are user data, not instructions (see *Security and privacy*). `supabase/functions/_shared/samples/` must only use values that exist in the app lists (e.g. facilities).

**Events** (`type = 'event'`, next sprint): activities that do not last the whole year will need dates; add them with a new migration and update the decision record.

### Local development

- `npx supabase start` needs Docker running and the user in the `docker` group (`sudo usermod -aG docker $USER`, then log in again). Never run Supabase with `sudo`.
- Studio: `http://127.0.0.1:54323`. Keys: `npx supabase status` → *Authentication Keys → Publishable*.
- To test on a phone with Expo Go, `EXPO_PUBLIC_SUPABASE_URL` in `mobile/.env` must use the computer's LAN IP (`http://192.168.x.x:54321`), not `127.0.0.1`, and the firewall must allow ports 8081 (Expo) and 54321 (Supabase).

## Security and privacy

- The app stores data about **minors** (family profiles). Store the minimum: age ranges, never birth dates. Never expose family profiles to other accounts.
- **Never put secret keys in the app.** The app only uses the Supabase **publishable** key (formerly *anon key*). The **secret** key (formerly *service_role*) and LLM API keys live only in Edge Function secrets.
- Every `EXPO_PUBLIC_*` variable is embedded in the app and readable by anyone: only public values may use that prefix.
- Never commit `.env` files or credentials. Required variables are listed in `mobile/.env.example`.
- RLS is the real protection: the app validation improves the experience but can be bypassed with the publishable key.
- Text written by users that is sent to the LLM (e.g. technical sheet fields) is **data, not instructions**: keep it clearly separated in the prompt and limit its length.
- Validate and allow-list any value passed to shell commands or file paths (see `scripts/`).

## Quality gate

Every pull request must pass the CI and the SonarQube quality gate:

- **Coverage ≥ 80% on new code.** Write tests for all logic **and** for components and hooks. Only routes, configuration, generated files and test helpers are excluded from coverage: `mobile/src/app/**`, `mobile/src/lib/database.types.ts`, `mobile/src/lib/supabase.ts`, `mobile/src/lib/queryClient.ts` and `mobile/src/test-utils/**`. Keep the Jest (`collectCoverageFrom` in `mobile/package.json`) and SonarQube (`sonar.coverage.exclusions`) lists in sync.
- **Duplication ≤ 3% on new code.** Move repeated code to a shared module instead of copying it (this includes helpers in tests and repeated UI such as `FormSubmit`).
- **Security rating A.** Fix every security issue SonarQube reports.
- Keep functions small; split long functions by responsibility (e.g. `validateDetails`, `validateSchedule`, `validatePrices`).

Before declaring any task done, run in `mobile/`:

```
npx tsc --noEmit
npm run lint
npm test
```

When the CI fails but local checks pass, reproduce the CI with `npm ci` (clean install from `package-lock.json`): usually a dependency is missing from the committed `package.json`.

## Git workflow

- `main` always works. Never push to `main` directly.
- **One branch per issue**, created from the issue (`gh issue develop <number> --checkout`). **Sub-issues use their parent's branch.**
- Small commits that leave the code working, in the form `type: description (#issue)`, using the number of the sub-issue being worked on. Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`, `style`. Changes unrelated to the issue (e.g. formatting, `.gitignore`) go in their own commit without the issue number, or in their own branch.
- Stage files by path (`git add mobile/src/...`). Do not use `git add .` or `git add -A` at the root.
- Each branch is merged through a pull request with at least one review. The description lists every issue it closes, one per line: `Closes #32`, `Closes #33`… It includes a "How to test" section and a "Pending" section for what could not be verified yet.
- Rename or move files with `git mv` to keep their history.
- Personal tool settings (`.vscode/`, `.claude/`) and generated reports (`coverage/`) are ignored and never committed.

### Updating a branch and resolving conflicts

- Bring `main` into your branch before opening the pull request (`git merge main` or `git rebase main`), then run the checks again.
- **`package.json`:** keep the dependencies of **both** sides (usually the newer version of each package). Never accept one side blindly.
- **Generated files (`package-lock.json`, `database.types.ts`):** never resolve them by hand. Fix the source, then regenerate them (`rm package-lock.json && npm install`; `db reset` + `gen types`).
- Before committing a merge, check that no conflict markers are left: `git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"`.
- During a rebase, continue with `git rebase --continue` (not `git commit`). `git rebase --abort` returns to the state before the rebase.
- After rebasing an already pushed branch, push with `git push --force-with-lease` (never `--force`, and never on `main`).

## Native code and Expo Go

- The team develops with **Expo Go**, which only includes its bundled native modules. Do not add libraries with native code that Expo Go does not support without the team's agreement.
- `ios/` and `android/` are generated (Continuous Native Generation). Never create or edit them by hand; configure native behaviour in `app.json` and config plugins.
- Prefer Expo modules over third-party libraries.

## Conventions

- Code, comments, commit messages and documentation are written in **English**.
- Do not add new dependencies, native modules or services without the team's agreement. Mention every new dependency in the pull request.
- Every finished feature gets a guide in `docs/features/` (decisions, files and how to test).
- Prefer simple, readable code over clever code: this is a learning project, and every team member must be able to understand and explain it.

## Provider profiles

- Table `provider_profiles`, one row per provider, `status` is `draft` or
  `approved`. Show `approved` as "Published" (`PROFILE_STATUS_LABELS`).
- The Edge Function `generate-profile` uses the user's session, not the
  secret key. RLS lets the owner insert drafts and update its profile.
- AI content is never published automatically: the provider approves it.
- Details: `docs/features/ai-profile.md`.
