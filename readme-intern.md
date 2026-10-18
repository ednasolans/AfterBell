## Database Setup (Supabase)

AfterBell uses Supabase for authentication, PostgreSQL database
management and Row Level Security (RLS).

### Prerequisites

- Node.js 20+
- Docker
- Supabase CLI

### Installation

Install project dependencies:

```bash
npm install
```

Initialize Supabase locally if it has not already been initialized:

```bash
npx supabase init
```

### Local development

Start the local Supabase instance:

```bash
npx supabase start
```

Apply all database migrations:

```bash
npx supabase db reset
```

This command resets the local database and applies all migrations
from the `supabase/migrations/` directory.

### Generate database types

Run:

```bash
npm run db:types
```

The generated types are stored in:

`mobile/src/lib/database.types.ts`

Regenerate and commit these types whenever the database schema changes.

### Remote database

Log in to Supabase:

```bash
npx supabase login
```

Link the repository to the Supabase project:

```bash
npx supabase link --project-ref oswvqmfijcjhnoyqhxle
```

Apply pending migrations to the linked project:

```bash
npx supabase db push
```

### Important notes

- Do not commit database passwords or secret API keys.
- All schema changes must be implemented through SQL migrations.
- Test migrations locally before applying them remotely.
- Coordinate remote database deployments with the team.