# AfterBell

AfterBell is a mobile marketplace of local activities. Families and adults discover and request activities, events and private tutors; providers (clubs, schools, academies, tutors and shops) publish their offer. AI generates each provider's public profile from a structured technical sheet and, later, recommends activities and summarises searches.

This is a university group project (MEINF, Universitat de Lleida) developed in sprints. The sprint plan, functionalities (F1–F14) and decisions are in `docs/`.

## Repository structure

```
mobile/      React Native app (Expo + TypeScript). See mobile/AGENTS.md
supabase/    Backend: migrations, Edge Functions, seed data
scripts/     Project management scripts (burndown, Gantt, EVM). Python
docs/        Sprint deliveries and technical decisions
.github/     CI workflows (lint, type check, tests, SonarQube)
```

## Stack

- **App:** React Native with Expo, Expo Router, TypeScript (strict), TanStack Query.
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions in TypeScript).
- **AI:** an external LLM API, called **only** from Supabase Edge Functions.
- **Tests:** Jest with the `jest-expo` preset and React Native Testing Library.
- **Quality:** SonarQube Cloud on every pull request.

## Database (Supabase)

### Migrations

- **Every schema change is a migration** in `supabase/migrations/`, created from the repository root with `npx supabase migration new <name>`. Never change tables from the Supabase dashboard.
- **Never edit a migration that has already been applied** by a teammate or on the remote project. Create a new migration instead.
- Migrations run in timestamp order: a migration can only use tables and functions created by earlier ones (e.g. `is_company()` is created in `create_accounts`).
- **After changing the schema, regenerate the TypeScript types** from the repository root:
  `npx supabase gen types typescript --local > mobile/src/lib/database.types.ts`. Never edit that file by hand.
- Database names use `snake_case`; app code uses `camelCase`. The `api/` layer of each feature converts between them.

### Table design

- **Owner columns default to the logged-in user:** `provider_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.accounts(id)`. The app never sends the owner id.
- **`CHECK` constraints mirror the app validation** (`validation.ts`): required text not blank (`btrim(x) <> ''`), allowed values (`IN (...)` or `<@ ARRAY[...]::TEXT[]`), non-empty lists (`cardinality(x) > 0`), and rules across columns as named constraints (e.g. `price_range_is_valid`). The app validates for the user; the database guarantees the data.
- **Limit the length of every free-text column** (`char_length(x) <= N`), especially text that will be sent to the LLM.
- Optional values are stored as `NULL`, never as `''`.
- Money uses `NUMERIC(8, 2)`, never `FLOAT`.
- Small nested lists that are always read and written together (e.g. a schedule) can be a `JSONB` column with a `jsonb_typeof(x) = 'array'` check.
- Add an index on every foreign key used by RLS policies (e.g. `provider_id`).
- Shared value lists must match the database exactly (enum values, check constraints). Example: age ranges are defined once in `mobile/src/lib/ages.ts`.

### Row-Level Security and privileges

Every table has **two layers**, both in the migration that creates it:

1. **Privileges (which operations and columns):** start with `REVOKE ALL ON TABLE ... FROM PUBLIC, anon, authenticated;` and grant only what is needed. Grant `UPDATE` on a **column list** that excludes ids, owner columns and creation dates.
2. **RLS (which rows):** `ENABLE ROW LEVEL SECURITY` and one policy per allowed operation:
   - `USING` decides which existing rows can be read or changed; `WITH CHECK` decides which rows can be written. `UPDATE` policies need both.
   - Write `(SELECT auth.uid())` and `(SELECT public.is_company())` inside parentheses, so they are evaluated once per query.
   - Use `is_company()` to restrict provider-only operations.
   - No policy means no access: do not add `DELETE` policies unless the product needs them.
   - Start closed. Opening access later is a new policy; closing it after release means data has already leaked.

### Testing RLS

Test every policy by impersonating a user in the SQL Editor (or `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres`):

```sql
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT id FROM public.accounts WHERE email = 'club@test.com'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
-- statement to test
ROLLBACK;
```

Call `set_config` before `SET LOCAL ROLE` (the lookup in `accounts` needs admin rights). Use `SET LOCAL ROLE anon` for users without a session. For each table, check that allowed operations succeed **and** that forbidden ones fail (other users' rows, wrong account type, invalid data).

### Local development

- `npx supabase start` (needs Docker running and the user in the `docker` group; never run it with `sudo`), then `npx supabase db reset` to apply all migrations and `seed.sql`.
- Studio: `http://127.0.0.1:54323`. Keys: `npx supabase status`.
- To test on a phone with Expo Go, `EXPO_PUBLIC_SUPABASE_URL` must use the computer's LAN IP (`http://192.168.x.x:54321`), not `127.0.0.1`, and the firewall must allow port 54321.

## Security and privacy

- The app stores data about **minors** (family profiles). Store the minimum: age ranges, never birth dates. Never expose family profiles to other accounts.
- **Never put secret keys in the app.** The app only uses the Supabase **publishable** key (formerly *anon key*). The **secret** key (formerly *service_role*) and LLM API keys live only in Edge Function secrets.
- Every `EXPO_PUBLIC_*` variable is embedded in the app and readable by anyone: only public values may use that prefix.
- Never commit `.env` files or credentials. Required variables are listed in `mobile/.env.example`.
- Text written by users that is sent to the LLM (e.g. technical sheet fields) is **data, not instructions**: keep it clearly separated in the prompt and limit its length.
- Validate and allow-list any value passed to shell commands or file paths (see `scripts/`).

## Quality gate

Every pull request must pass the CI and the SonarQube quality gate:

- **Coverage ≥ 80% on new code.** Write tests for all logic **and** for components and hooks (see `mobile/AGENTS.md`). Only routes, configuration and generated files are excluded from coverage: `mobile/src/app/**`, `mobile/src/lib/database.types.ts` and `mobile/src/lib/supabase.ts`. Keep the Jest (`collectCoverageFrom` in `mobile/package.json`) and SonarQube (`sonar.coverage.exclusions`) exclusion lists in sync.
- **Duplication ≤ 3% on new code.** Move repeated code to a shared module instead of copying it (this includes helpers in tests).
- **Security rating A.** Fix every security issue SonarQube reports.
- Keep functions small; split long functions by responsibility.

Before declaring any task done, run in `mobile/`:

```
npm run lint
npx tsc --noEmit
npm test
```

## Git workflow

- `main` always works. Never push to `main` directly.
- **One branch per issue**, created from the issue (`gh issue develop <number> --checkout`). Sub-issues use their parent's branch.
- Small commits that leave the code working, in the form `type: description (#issue)`. Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`.
- Each branch is merged through a pull request with at least one review. The description includes `Closes #<issue>`.
- Rename or move files with `git mv` to keep their history.

### Updating a branch and resolving conflicts

- Bring `main` into your branch before opening the pull request (`git merge main` or `git rebase main`), then run lint, type check and tests again.
- **`package.json`:** keep the dependencies of **both** sides (usually the newer version of each package). Never accept one side blindly.
- **`package-lock.json`:** never resolve it by hand. Fix `package.json`, then run `rm package-lock.json && npm install` and stage the regenerated file.
- Before committing a merge, check that no conflict markers are left: `git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"`.
- During a rebase, continue with `git rebase --continue` (not `git commit`). `git rebase --abort` returns to the state before the rebase.
- After rebasing an already pushed branch, push with `git push --force-with-lease` (never `--force`, and never on `main`).

## Conventions

- Code, comments, commit messages and documentation are written in **English**.
- Do not add new dependencies, native modules or services without the team's agreement. Mention every new dependency in the pull request.
- Prefer simple, readable code over clever code: this is a learning project, and every team member must be able to understand and explain it.