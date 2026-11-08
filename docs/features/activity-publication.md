# Activity publication for all categories (C3, #85)

Providers of every category publish and unpublish their activities from the
app, and see everything that is missing before they can publish. Customers
only see published activities. Categories come from the database, so a new
category needs one migration and no app release.

Sub-issues: #86 category catalogue, #87 publish and unpublish, #88 provider
UI, #89 customer view.

## Flow

1. A new activity is saved as a **draft** (`activities.status = 'draft'`).
2. The provider opens it with **Edit**. The **Publication** panel at the top
   shows the status and, for a draft, the list of missing requirements.
3. When nothing is missing, **Publish** asks for confirmation and sets
   `status = 'published'`. Customers can now see it.
4. **Unpublish** asks for confirmation and sets `status = 'draft'`. The
   activity and its data are kept; it can be published again.
5. In **My activities** each card shows **Draft** or **Published**.

## Categories (#86)

- Table `categories` (`name`, `category_type`), created in C11. The name is
  the value stored in `activities.category` (foreign key),
  `technical_sheets.activity_types` and `family_profiles.interests` (checked
  by a trigger). Names cannot be renamed or deleted.
- The app reads the catalogue with `useCategories()` (`mobile/src/lib/`),
  cached for one hour: it only changes with migrations.
- `categoryLabel()` shows the known label, or builds one for categories the
  app does not know yet (`board_games` → "Board games").
  `categoryOptions()` falls back to the known list while the catalogue loads
  or if it fails; the database still rejects unknown categories.
- `activityImage()` uses the generic "other" image for new categories.
- Still pending: the technical sheet and family profile forms use the fixed
  list (`ACTIVITY_CATEGORIES`). They can switch to
  `categoryOptions(useCategories().data)`.

## Publication rules (#87)

`publication_issues()` is the only place with the rules. It returns one code
per missing requirement:

| Code | Missing requirement |
|---|---|
| `technical_sheet` | A technical sheet with a name and an email or phone number |
| `address` | A complete structured address (street, number, postal code, city, province, country) |
| `dates` | Valid start and end dates for a temporary activity |
| `language` | A language and level for language or tutor activities |

It is used by:

- `activity_publication_issues(p_activity_id)`: the app asks what is missing.
  It answers only the owner of the activity (NULL for anyone else).
- The trigger `require_publication_fields`: rejects publishing with the
  previous message of the first issue, and lists every issue in the `DETAIL`
  of the error (`Missing: address, language`).
- `can_publish_activity()`.

Publishing is a normal `UPDATE` of `status`: RLS lets only the owner change
it. Customers see only published activities through RLS, and the catalogue
queries also filter `status = 'published'` on purpose.

## Mobile app

| File | What it does |
|---|---|
| `lib/activityStatus.ts` | `draft` / `published` and their labels |
| `lib/activityCategories.ts` | `categoryLabel()`, `categoryOptions()` |
| `lib/categories.ts`, `lib/useCategories.ts` | Read the category catalogue |
| `features/activities/api/changeActivityStatus.ts` | Publish or unpublish; throws if no row changed |
| `features/activities/api/fetchPublicationIssues.ts` | Calls `activity_publication_issues` |
| `features/activities/hooks/useChangeActivityStatus.ts` | Mutation; refreshes every activity query on success |
| `features/activities/hooks/usePublicationIssues.ts` | What is missing to publish one activity |
| `features/activities/components/PublicationPanel.tsx` | Status, missing requirements, Publish / Unpublish |
| `features/activities/components/EditActivity.tsx` | Shows the panel above the form (`header` prop) |
| `features/activities/components/ActivityCard.tsx` | Draft / Published label |
| `features/catalog/api/fetchCatalogActivit{y,ies}.ts` | Only published activities |

## How to test

```powershell
npx supabase db reset
Get-Content supabase/tests/categories.sql | docker exec -i supabase_db_AfterBell psql -U postgres -d postgres
Get-Content supabase/tests/activity_publication.sql | docker exec -i supabase_db_AfterBell psql -U postgres -d postgres
cd mobile
npx tsc --noEmit
npm test
```

Every line of the SQL tests must start with `ok`.

In the app:

1. Log in as a provider with a technical sheet and a structured address.
2. Create an activity: it appears as **Draft** in My activities.
3. Open it with **Edit**: the panel says it is ready; tap **Publish** and confirm.
4. Log in as a customer: the activity is in the catalogue.
5. Unpublish it as the provider: the customer no longer sees it, and opening
   its detail says "This activity is no longer available."
6. With an incomplete address (or a language activity without languages) the
   panel lists what is missing and there is no Publish button.

## Known limitations

- The panel checks the saved activity: unsaved changes in the form are not
  taken into account until they are saved.
- Publishing does not require an approved AI profile, but the catalogue only
  shows activities of providers with an approved profile. The team has to
  decide whether it should be a publication requirement; if so, add an
  `ai_profile` code to `publication_issues()`.