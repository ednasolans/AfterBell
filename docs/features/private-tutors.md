# Private tutors (C5, #95)

## Issue #96 - Tutor registration and profile

Individual tutors use the existing authentication and provider
data model. No separate tutor profile table is required.

## Data model

- accounts: account_type = tutor
- technical_sheets: first_name, last_name, description,
  provider_type = private_tutor
- addresses: structured address with street, number,
  floor, door, postal code, city, province and country
- activities: is_tutor already exists; offer management
  belongs to #97

## Registration

Uses Supabase Auth signUp with account_type = tutor
and the required profile and address metadata.

The database automatically creates the technical sheet
and the main structured address.

Invalid registration data is rejected.

## Profile management

A tutor can read their own technical sheet and address.

Profile updates use update_my_tutor_profile(), which
updates both tables in one database transaction.

Row-Level Security and column permissions prevent
modification of another provider's data.

## Validation

First name: required, max 50 characters
Last name: required, max 50 characters
Presentation: required, max 500 characters
Street: required, max 200 characters
Number: required, max 20 characters
Floor and door: optional, max 20 characters
City: required, max 100 characters
Province: required, max 100 characters
Country: Spain
Postal code: valid Spanish five-digit format

Validation is implemented in the mobile API layer
and PostgreSQL.

## Security

Tutor technical sheets are owner-only.
Tutor addresses are private to their owners.
Company address visibility remains unchanged.

The registration trigger uses SECURITY DEFINER.
The update RPC uses SECURITY INVOKER and respects RLS.

## Tests

- supabase/tests/tutor_registration.sql
- mobile/src/features/tutors/validation.test.ts
- mobile/src/features/tutors/api/registerTutor.test.ts
- mobile/src/features/tutors/api/tutorProfileApi.test.ts
- mobile/src/features/auth/authRouting.test.ts

## Pending

#97 - Subjects, levels and tutor offer publication
#98 - Tutor registration, profile and offer UI
#99 - Customer-facing tutor offers
