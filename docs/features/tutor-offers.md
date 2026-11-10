
# Tutor offers — C5 / #97

## Overview

Tutors can create, edit, publish, unpublish and delete
teaching offers.

This feature depends on tutor registration (#96), the
category catalogue (#86) and activity publication (#87).

No `tutor_profiles` table is created.

## Database

### tutor_subjects

Catalogue of teaching subjects.

Columns:
- code: stable primary key
- name: display label

### tutor_levels

Catalogue of education levels.

Columns:
- code: stable primary key
- name: display label

### tutor_offers

- id: UUID primary key
- tutor_id: references accounts
- technical_sheet_id: references technical_sheets
- title: optional in drafts
- description: optional
- subject_codes: array of catalogue subject codes
- level_codes: array of catalogue level codes
- price_per_hour: nullable price in euros
- category: always `tutoring`
- status: `draft` or `published`
- created_at, updated_at

The database validates catalogue references and tutor
ownership.

## API

Supabase exposes tables through PostgREST. All endpoints
require an authenticated user.

### Catalogues

GET /rest/v1/tutor_subjects?select=code,name
GET /rest/v1/tutor_levels?select=code,name

### Owner CRUD

POST /rest/v1/tutor_offers
GET /rest/v1/tutor_offers
PATCH /rest/v1/tutor_offers?id=eq.{id}
DELETE /rest/v1/tutor_offers?id=eq.{id}

Owner operations use the authenticated session.
RLS restricts writes to the owner.

### Publication requirements

POST /rest/v1/rpc/tutor_offer_publication_issues

Body:
{
  "p_offer_id": "offer-uuid"
}

Returns an array of codes:
- technical_sheet
- address
- title
- subjects
- levels
- price

Only the owner receives the list.
Other users receive null.

### Publish

PATCH /rest/v1/tutor_offers?id=eq.{id}

Body:
{
  "status": "published"
}

The database rejects incomplete offers. The error
DETAIL contains the missing fields.

### Unpublish

PATCH /rest/v1/tutor_offers?id=eq.{id}

Body:
{
  "status": "draft"
}

Unpublishing preserves the offer.

### Customer visibility

GET /rest/v1/tutor_offers?status=eq.published

Published offers are readable by authenticated users.
Drafts are visible only to their owner through RLS.

## Publication rules

An offer requires:
- A complete tutor technical sheet
- A structured address
- A nonempty title
- At least one valid subject
- At least one valid education level
- An hourly price

Subject and level values must exist in their catalogues.
The offer category is always `tutoring`.

## Mobile API

mobile/src/features/tutor-offers/api/tutorCatalogApi.ts

mobile/src/features/tutor-offers/api/tutorOffersApi.ts

The mobile API implements catalogue reads, owner CRUD,
publication changes and published-offer reads.

## Limitations

Tutor offers are stored separately from activities.
They reuse shared technical-sheet and address
publication requirements, but are not automatically
included in the general activities catalogue.

Customer-facing screens and filters can consume the
published tutor-offer API in the following features.
