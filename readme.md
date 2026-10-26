# AfterBell

AfterBell is a mobile marketplace of local activities. Families and adults discover and request after-school activities, events and private tutors, and providers (clubs, schools, academies, tutors and shops) publish their offer. An AI model writes each provider's public profile from a structured technical sheet and, in later sprints, recommends activities and summarises searches.

University group project of the Master's in Informatics Engineering (MEINF, Universitat de Lleida), developed in sprints by Abril, Carlos, Edna and Pau.

## Features

| Feature | Status | Guide |
|---|---|---|
| Customer and company accounts (sign-up, login, separate areas) | Sprint 1 | — |
| Family profiles (shared family group, active profile) | Sprint 1 | [family-profiles.md](docs/features/family-profiles.md) |
| Provider technical sheet, with several addresses | Sprint 1 | [technical-sheet.md](docs/features/technical-sheet.md) |
| AI-generated provider profile (generate, edit, approve) | Sprint 1 | [ai-profile.md](docs/features/ai-profile.md) |
| Activity publication (create, list, edit, delete) | Sprint 1 | [activities.md](docs/features/activities.md) |
| Activity catalog for customers | Sprint 1 | — |
| Search and filters, events, tutors, recommendations, favourites and enrolment requests | Sprint 2 | — |

## Tech stack

- **Mobile app:** React Native with Expo (SDK 57), Expo Router and TypeScript. TanStack Query for server data.
- **Backend:** Supabase: PostgreSQL with Row-Level Security, Auth and Edge Functions.
- **AI:** an OpenAI-compatible LLM API, called only from the `generate-profile` Edge Function ([decision](docs/decisions/002-llm-provider.md)).
- **Tests and quality:** Jest with React Native Testing Library, Deno tests for the Edge Functions, SonarQube Cloud on every pull request.

## Repository structure

```text
AfterBell/
├── .github/workflows/      # CI (lint, type check, tests, SonarQube) and sprint metrics
├── docs/
│   ├── decisions/          # Technical decisions (stack, LLM provider, database design)
│   └── features/           # One guide per feature: what was built, where and how to test it
├── mobile/                 # React Native + Expo + TypeScript app
│   ├── AGENTS.md           # Development rules for the team and AI tools
│   └── src/
│       ├── app/            # Screens (Expo Router): (auth), (customer), (provider)
│       ├── features/       # One folder per feature: api, hooks, components, types, validation
│       ├── components/     # Reusable UI components
│       ├── lib/            # Supabase client, generated DB types and shared helpers
│       └── test-utils/     # Helpers used only by tests
├── supabase/
│   ├── migrations/         # Versioned database schema (the only way to change it)
│   ├── functions/          # Edge Functions (generate-profile) and their tests
│   ├── tests/              # SQL tests of the RLS policies
│   └── seed.sql            # Development seed data
├── scripts/                # Burndown, Gantt and EVM scripts (Python)
├── package.json            # Supabase CLI and database scripts
└── sonar-project.properties
```

## Getting started

### Prerequisites

- Node.js 20 or newer (the CI uses Node 26) and npm.
- Docker, running, to start Supabase locally. On Linux, add your user to the `docker` group instead of using `sudo`.
- The **Expo Go** app on your phone, or an Android/iOS emulator.

### 1. Install dependencies

```bash
git clone https://github.com/ednasolans/AfterBell.git
cd AfterBell
npm ci                # Supabase CLI (repository root)
cd mobile && npm ci   # mobile app
```

Run `npm ci` again in the folder whose `package.json` changes after a `git pull`.

### 2. Start the database

From the repository root:

```bash
npx supabase start    # starts Supabase in Docker
npx supabase db reset # creates the database from every migration and seed.sql
npm run db:types      # regenerates mobile/src/lib/database.types.ts
```

`npx supabase status` shows the local URLs and keys. Studio (the database web interface) is at http://127.0.0.1:54323.

### 3. Configure the app

Copy `mobile/.env.example` to `mobile/.env` and fill it in with the values of `npx supabase status`:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://<your-computer-LAN-IP>:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<Publishable key>
```

Use your computer's LAN IP (e.g. `192.168.1.20`), not `127.0.0.1`: the phone has to reach your computer. The firewall must allow ports 8081 (Expo) and 54321 (Supabase). Never commit `.env` files.

### 4. Run the app

```bash
cd mobile
npx expo start
```

Scan the QR code with Expo Go. If you change `.env` or move files, restart with `npx expo start -c`.

### 5. AI profile (optional)

The profile generation needs an LLM API key. Create `supabase/functions/.env` (git-ignored) with `LLM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL`, then serve the function from the repository root:

```bash
npx supabase functions serve --env-file supabase/functions/.env
```

See [ai-profile.md](docs/features/ai-profile.md) for details.

## Tests and quality

From `mobile/`:

```bash
npx tsc --noEmit        # type check
npm run lint            # lint
npm test                # tests
npm run test:coverage   # tests with coverage report
```

- **Edge Functions:** `deno test` in `supabase/functions`.
- **Security policies:** SQL tests in `supabase/tests/` and in each feature guide, run in the SQL Editor impersonating different users (see *Testing RLS* in [AGENTS.md](mobile/AGENTS.md)).
- **CI:** every pull request runs lint, type check, tests with coverage and the SonarQube analysis. The quality gate requires at least 80% coverage and at most 3% duplication on new code.

## Database changes

Every schema change is a new migration (`npx supabase migration new <name>`); migrations already in `main` are never edited. After changing the schema, run `npx supabase db reset` and `npm run db:types`, and commit the regenerated types together with the migration. Never edit `database.types.ts` by hand.

The design of every table and the reasons behind it are in [docs/decisions/database.md](docs/decisions/database.md). The full schema can be viewed by pasting [database.dbml](docs/decisions/database.dbml) in [dbdiagram.io](https://dbdiagram.io).

Remote deployment (`npx supabase link` + `npx supabase db push`) is coordinated with the team: test every migration locally first.

## Project management

Sprint work is tracked with GitHub issues, milestones and a GitHub Project (estimated and actual hours, planned dates).

- **Sprint charts** (`burndown.yml`): burndown and Gantt charts, generated every night and on demand from the *Actions* tab.
- **Sprint EVM metrics** (`evm.yml`): Earned Value report (PV, EV, AC, CPI, SPI, EAC…), run manually at the end of each sprint.
- **Set Actual Start** (`set-actual-start.yml`): fills in the actual start date of an issue when its branch is created.

The scripts are in `scripts/` and can also be run locally (see the header of each script).

## Contributing

Read [mobile/AGENTS.md](mobile/AGENTS.md) before contributing. In short:

- One branch per issue, created from the issue; sub-issues use their parent's branch.
- Commits in the form `type: description (#issue)`.
- Every change goes through a pull request reviewed by another member, with a *How to test* section.
- Code, comments, commits and documentation are written in English.
