# Feature guide: whole-year technical sheet (issue #22)

This guide explains what was built for the provider's technical sheet, where each piece lives and why it was designed this way. It is meant for team members who need to change or extend the feature and for the teaching staff reviewing the sprint.

> **Status:** merged into `main` (issue #22, pull request with `Closes #22`).
> **Later changes:**
> - Issue #32 moved the target ages, schedule and prices from the technical sheet to each activity (see [`activities.md`](activities.md)).
> - The provider addresses issue replaced the sheet's `city` and `address` with a list of addresses in their own table, added a description and two facilities.
>
> This guide describes the current state. The database design is justified in [`docs/decisions/database.md`](../decisions/database.md).

## 1. What the feature does

A provider (a club, school, academy or private tutor) fills in a **technical sheet** with its basic information. The sheet is the structured input from which the AI will later generate the provider's **public profile** (another issue). Families never read the sheet directly: they see the generated profile.

The form has five sections:

| Section | Fields | Required |
|---|---|---|
| Basic information | Name, provider type, description | Name and provider type |
| Addresses | One or more addresses (street and number, city). The first one is the **main address** | At least one, with both fields |
| Contact | Phone number, email, website | A phone number **or** an email |
| Activity | Activity types (several categories) | At least one |
| Facilities | Facilities (parking, changing rooms, outdoor field…) | No |

Errors are shown under each field after the first attempt to save, and update while typing. Saving creates the addresses in the `addresses` table and then the sheet in `technical_sheets`, pointing to the main address. The addresses are later chosen when creating an activity.

## 2. Design decisions

| Decision | Alternatives considered | Why |
|---|---|---|
| **Closed value lists** for provider types, activity categories and facilities | Free text | Filters ("clubs with parking") are only possible with known values; the database can validate them; the AI receives controlled values instead of arbitrary text. New values are added to the list (as `outdoor_field` and `indoor_court`, used by the AI sample sheets). |
| Each list is an `as const` array with a derived type and a `Record` of labels | Separate enum + labels | One source of truth: TypeScript fails if a label is missing, and the database `CHECK` uses exactly the same values. |
| **`null` means "not chosen yet"** (`providerType: null`) | A default value | A default would be saved without the provider choosing it. |
| Errors appear **after the first save attempt** | From the start / only on save | Showing every field in red on an empty form is aggressive; validating live after the first attempt helps the user fix them. |
| **Validation in the app and in the database**, with the same length limits | Only one of them | The app gives clear messages under each field; the database (`CHECK` constraints and RLS) guarantees the data even if someone bypasses the app with the public key. |
| **Owner filled by the database** (`provider_id DEFAULT auth.uid()`) | Sending the user id from the app | The app cannot send a wrong or forged owner; RLS checks it anyway. |
| **Families cannot read technical sheets** (team decision) | Public read | Families see the AI-generated profile. Private data stays private; opening access later is a new policy. |
| **Several addresses in their own table**, entered in this form | `city` and `address` columns in the sheet | A provider can work in several places and each activity happens in one of them. See the decision record for the composite foreign key that stops a provider from using another provider's address. |
| **The first address is the main one** and cannot be removed | A "main" checkbox | There is always one main address without an extra field. The form starts with one empty address. |
| **Addresses are validated one by one**: the errors are a list in the same order as the form | One message for all the addresses | Each message appears under the address that has the problem. |
| **Addresses first, then the sheet; if a step fails, the new addresses are deleted** | One database transaction (`rpc`) | Supabase cannot run several inserts in one transaction from the app. Cleaning up avoids addresses without a sheet and duplicates on retry. If more multi-table saves appear, move them to a database function. |
| **The main address is inserted on its own** | Inserting every address at once | The order of the rows returned by a multiple insert is not guaranteed; inserting the main one alone gives its id for sure. |
| **Optional short description** (max 500 characters) | No description | It was in the Figma design and gives the AI context about the provider. |
| **API layer with a fake implementation first** | Waiting for the database issue | The form, hook and tests were finished before Supabase was merged; only `saveTechnicalSheet` changed when the real database arrived. |
| **React Native Testing Library** for hooks and components | Excluding UI from coverage | The hook contains the most delicate logic (validation before saving, no double submit) and deserves tests; coverage stays above the 80% quality gate. |
| Ages, schedule and prices **moved to activities** (issue #32) | Keeping them in both places | They describe each activity, not the provider. |

## 3. Files

### Database (`supabase/migrations/`)

| File | Content |
|---|---|
| `…_create_technical_sheets.sql` | `technical_sheets` table: `CHECK` constraints mirroring the app validation, text length limits (the sheet will be sent to the LLM), RLS (owner-only read and update, insert only for `company` accounts), column-level `UPDATE` privileges, no delete. |
| `…_remove_activity_fields_from_technical_sheets.sql` | (Issue #32) Drops `target_age_ranges`, `schedule`, `price_min`, `price_max`, `price_period` and the price range constraint. |
| `…_create_addresses.sql` | `addresses` table (`address`, `city`), `UNIQUE (id, provider_id)` for the composite foreign keys, index on `provider_id`, RLS (read for every logged-in user, create for companies, update/delete for the owner) and privileges. |
| `…_use_addresses_in_technical_sheets_and_activities.sql` | Moves the old `address`/`city` of each sheet to `addresses`; adds `address_id` with the composite foreign key; drops `address` and `city`; adds `description`; adds `outdoor_field` and `indoor_court` to the facilities constraint; also adds `address_id` to activities. |

### App: feature (`mobile/src/features/technical-sheet/`)

| File | Content |
|---|---|
| `types.ts` | `PROVIDER_TYPES`, `FACILITIES` and their labels; `TechnicalSheetForm` (with `description` and `addresses`); `EMPTY_TECHNICAL_SHEET_FORM` (starts with one empty address). |
| `validation.ts` | `validateTechnicalSheet`, split by section (`validateIdentity`, `validateAddresses`, `validateContact`, `validateActivity`). `SheetErrors` has one message per field and a list of errors for the addresses. |
| `api/toTechnicalSheetInsert.ts` | Maps the form and the id of the main address to a database row: `camelCase` → `snake_case`, trimmed text, empty optional fields → `NULL`. Does not send `provider_id`. |
| `api/saveTechnicalSheet.ts` | Inserts the main address, the other addresses and the sheet; deletes the new addresses if a later step fails. |
| `hooks/useTechnicalSheetForm.ts` | Form state, errors after the first attempt, saving state and save error. |
| `components/TechnicalSheetForm.tsx` | The form screen content, with section headers, the addresses editor and the shared `FormSubmit` footer. |

### App: shared code created or used by this feature

| File | Content |
|---|---|
| `lib/addresses.ts` | `AddressForm`, `Address`, `EMPTY_ADDRESS_FORM`, limits (`ADDRESS_MAX_LENGTH`, `CITY_MAX_LENGTH`), `validateAddress`, `formatAddress` ("C/ Major 1, Lleida") and `toAddressInsert`. Shared with activities. |
| `components/AddressesEditor.tsx` | List of addresses with "Add another address" and remove buttons; the first one is the main address and cannot be removed; shows each address's errors under it. |
| `components/TextField.tsx` | Labelled text input with error message (accessible label, keyboard type, capitalisation, multiline). |
| `components/Select.tsx`, `MultiSelect.tsx`, `SelectField.tsx`, `OptionsModal.tsx` | Generic single and multiple choice fields (`<T extends string>`) that open a modal with the options. |
| `components/FormSubmit.tsx` | Footer shared by every form: error summary, save error and save button with spinner. |
| `lib/activityCategories.ts` | Activity categories (shared with activities). |
| `lib/validation.ts` | `isValidEmail`, `isValidPhoneNumber`, `isValidWebsite`, `isBlank`, `hasErrors`. |
| `lib/text.ts` | `emptyToNull`. |
| `lib/arrays.ts` | `toggleItemInArray` (used by `MultiSelect`). |
| `test-utils/supabaseQueryMock.ts` | Fake chainable Supabase query (now also with `in`, used to delete the addresses). |

### Route

| File | Content |
|---|---|
| `app/technical-sheet-preview.tsx` | **Temporary** screen to try the form until it is linked from the provider area. |

Every file with logic has a test next to it (`*.test.ts` / `*.test.tsx`).

## 4. How to test it

**Automated:** `npm test` in `mobile/`. Covers validation (including several addresses and the errors of each one), the mappers, the save flow (main address, other addresses, sheet, and the clean-up when each step fails, with Supabase mocked), the hook, the addresses editor and a full user flow of the form with two addresses.

**Database (SQL Editor, impersonating users)** — see *Testing RLS* in `mobile/AGENTS.md`:

| Test | Expected |
|---|---|
| A `customer` inserts a sheet | RLS violation |
| A `company` inserts a sheet | Inserted; `provider_id` is the user's id |
| A `company` inserts a sheet for another `provider_id` | RLS violation |
| No phone and no email | `has_phone_or_email` violation |
| Activity type not in the list | `activity_types` check violation |
| `anon` reads the table | Permission denied |
| A `customer` inserts an address | RLS violation |
| A `company` inserts an address, then a sheet with it, a description and the facilities `indoor_court` and `outdoor_field` | Inserted |
| Club B updates or deletes club A's address | `UPDATE 0` / `DELETE 0` |
| Club A changes the `provider_id` of its address | Permission denied |
| Club A deletes an address used by its sheet | `technical_sheets_address_fkey` violation |
| Address with a blank city | `addresses_city_check` violation |
| Description longer than 500 characters | `technical_sheets_description_check` violation |
| Existing sheets after the migration | Each one points to a new address with its old address and city |

**App:** open the `technical-sheet-preview` route in Expo Go, press **Save** with the form empty (errors appear, including "Address is required"), add and remove addresses, and fill it in (errors disappear while typing). Saving for real needs a logged-in `company` user.

## 5. Known limitations and pending work

- [ ] **End-to-end save from the phone** once login works.
- [ ] Decide whether a provider has **one sheet or several** (now several are allowed; one would be `UNIQUE (provider_id)`).
- [ ] **Edit the sheet and its addresses** after saving (only creation exists). Removing an address used by an activity must show a clear message: the database rejects it.
- [ ] Saving the sheet and its addresses is **not atomic**: move it to a database function if it causes problems.
- [ ] Self-registration as `company` is open (the account type comes from the sign-up data): confirm this is intended.
- [ ] The Figma 3-step wizard is not included.
- [ ] Replace the temporary preview route with a screen in the `(provider)` area.
