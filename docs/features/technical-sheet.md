# Feature guide: whole-year technical sheet (issue #22)

This guide explains what was built for the provider's technical sheet, where each piece lives and why it was designed this way. It is meant for team members who need to change or extend the feature and for the teaching staff reviewing the sprint.

> **Status:** merged into `main` (issue #22, pull request with `Closes #22`).
> **Later change:** in issue #32 the target ages, schedule and prices were moved from the technical sheet to each activity (see [`activities.md`](activities.md)). This guide describes the current state and marks what changed.

## 1. What the feature does

A provider (a club, school, academy or private tutor) fills in a **technical sheet** with its basic information. The sheet is the structured input from which the AI will later generate the provider's **public profile** (another issue). Families never read the sheet directly: they see the generated profile.

The form has three sections:

| Section | Fields | Required |
|---|---|---|
| Basic information | Name, provider type, city, address, phone number, email, website | Name, provider type, city, and a phone number **or** an email |
| Activity | Activity types (several categories) | At least one |
| Facilities | Facilities (parking, changing rooms…) | No |

Errors are shown under each field after the first attempt to save, and update while the user types. Saving inserts a row in the `technical_sheets` table in Supabase.

## 2. Design decisions

| Decision | Alternatives considered | Why |
|---|---|---|
| **Closed value lists** for provider types, activity categories and facilities | Free text | Filters ("clubs with parking") are only possible with known values; the database can validate them; the AI receives controlled values instead of arbitrary text. New values are added to the list. |
| Each list is an `as const` array with a derived type and a `Record` of labels | Separate enum + labels | One source of truth: TypeScript fails if a label is missing, and the database `CHECK` uses exactly the same values. |
| **`null` means "not chosen yet"** (`providerType: null`) | A default value | A default would be saved without the provider choosing it. |
| Errors appear **after the first save attempt** | From the start / only on save | Showing every field in red on an empty form is aggressive; validating live after the first attempt helps the user fix them. |
| **Validation in the app and in the database** | Only one of them | The app gives clear messages under each field; the database (`CHECK` constraints and RLS) guarantees the data even if someone bypasses the app with the public key. |
| **Owner filled by the database** (`provider_id DEFAULT auth.uid()`) | Sending the user id from the app | The app cannot send a wrong or forged owner; RLS checks it anyway. |
| **Families cannot read technical sheets** (team decision) | Public read | Families see the AI-generated profile, which is what the app shows. Private data stays private; opening access later is a new policy. |
| **API layer with a fake implementation first** | Waiting for the database issue | The form, hook and tests were finished before Supabase was merged; only `saveTechnicalSheet` changed when the real database arrived. |
| **React Native Testing Library** for hooks and components | Excluding UI from coverage | The hook contains the most delicate logic (validation before saving, no double submit) and deserves tests; coverage stays above the 80% quality gate. |
| Ages, schedule and prices **moved to activities** (issue #32) | Keeping them in both places | They describe each activity, not the provider; keeping them in both tables would duplicate data. |

## 3. Files

### Database (`supabase/migrations/`)

| File | Content |
|---|---|
| `…_create_technical_sheets.sql` | `technical_sheets` table: `CHECK` constraints mirroring the app validation, text length limits (the sheet will be sent to the LLM), RLS (owner-only read and update, insert only for `company` accounts), column-level `UPDATE` privileges, no delete. |
| `…_remove_activity_fields_from_technical_sheets.sql` | (Issue #32) Drops `target_age_ranges`, `schedule`, `price_min`, `price_max`, `price_period` and the price range constraint. |

### App: feature (`mobile/src/features/technical-sheet/`)

| File | Content |
|---|---|
| `types.ts` | `PROVIDER_TYPES`, `FACILITIES` and their labels; `TechnicalSheetForm`; `EMPTY_TECHNICAL_SHEET_FORM`. |
| `validation.ts` | `validateTechnicalSheet`, split by section (`validateBasicInfo`, `validateActivity`). Returns one message per invalid field. |
| `api/toTechnicalSheetInsert.ts` | Maps the form to a database row: `camelCase` → `snake_case`, trimmed text, empty optional fields → `NULL`. Does not send `provider_id`. |
| `api/saveTechnicalSheet.ts` | Inserts the row; throws if Supabase returns an error. |
| `hooks/useTechnicalSheetForm.ts` | Form state, errors after the first attempt, saving state and save error. |
| `components/TechnicalSheetForm.tsx` | The form screen content, with section headers and the shared `FormSubmit` footer. |

### App: shared code created or used by this feature

| File | Content |
|---|---|
| `components/TextField.tsx` | Labelled text input with error message (accessible label, keyboard type, capitalisation, multiline). |
| `components/Select.tsx`, `MultiSelect.tsx`, `SelectField.tsx`, `OptionsModal.tsx` | Generic single and multiple choice fields (`<T extends string>`) that open a modal with the options. |
| `components/FormSubmit.tsx` | Footer shared by every form: error summary, save error and save button with spinner. |
| `lib/activityCategories.ts` | Activity categories (shared with activities). |
| `lib/validation.ts` | `isValidEmail`, `isBlank`, `hasErrors`. |
| `lib/text.ts` | `emptyToNull`. |
| `lib/arrays.ts` | `toggleItemInArray` (used by `MultiSelect`). |

### Route

| File | Content |
|---|---|
| `app/technical-sheet-preview.tsx` | **Temporary** screen to try the form until it is linked from the provider area. |

Every file with logic has a test next to it (`*.test.ts` / `*.test.tsx`).

## 4. How to test it

**Automated:** `npm test` in `mobile/`. Covers validation, the mapper, the save function (Supabase mocked), the hook and a full user flow of the form.

**Database (SQL Editor, impersonating users)** — see *Testing RLS* in `mobile/AGENTS.md`:

| Test | Expected |
|---|---|
| A `customer` inserts a sheet | RLS violation |
| A `company` inserts a sheet | Inserted; `provider_id` is the user's id |
| A `company` inserts a sheet for another `provider_id` | RLS violation |
| No phone and no email | `has_phone_or_email` violation |
| Activity type not in the list | `activity_types` check violation |
| `anon` reads the table | Permission denied |

**App:** open the `technical-sheet-preview` route in Expo Go, press **Save** with the form empty (errors appear), fill it in (errors disappear while typing). Saving for real needs a logged-in `company` user.

## 5. Known limitations and pending work

- [ ] **End-to-end save from the phone** once login works.
- [ ] The app does not validate the **website format** (`https://…`) nor the **text length limits**, which the database does check: the user would see a generic save error instead of a message under the field. Add both rules to `validation.ts` with tests.
- [ ] Decide whether a provider has **one sheet or several** (now several are allowed; one would be `UNIQUE (provider_id)`).
- [ ] Self-registration as `company` is open (the account type comes from the sign-up data): confirm this is intended.
- [ ] Replace the temporary preview route with a screen in the `(provider)` area.
