# Feature guide: enrolment requests (C9)

Families ask for a place in an activity, and the provider accepts or rejects the request. This guide explains the backend (#117): the API, its rules and the decisions behind them. The screens come with #118 (customers) and #119 (providers).

## 1. Rules

- A request is for **one family profile**. A family that wants two children in an activity sends two requests, and each one is accepted or rejected on its own (team decision).
- Only **published** activities that have **not finished** accept requests.
- The family profile must belong to the family that sends the request.
- A profile can have only **one active request** (pending or accepted) per activity. After a rejection or a cancellation it can ask again.
- A **full** activity does not accept new requests (team decision): a pending request that can never be accepted would only confuse the family. When someone cancels, the place is free again.
- **One participant per accepted request.** Accepting checks the places inside a transaction that locks the activity row, so two simultaneous acceptances can never go over the maximum.
- Statuses: `pending` → `accepted` or `rejected` (provider); `pending` or `accepted` → `cancelled` (family, which frees the place). Any other change is rejected.

### No limit of participants

An activity can have no limit, but only on purpose (team decision): `max_participants` is empty only when `unlimited_participants` is `true`. The flag is `false` by default, so forgetting the maximum is rejected instead of meaning "no limit" (`activities_participant_limit_is_explicit`). Existing activities keep their limit. The form gets a "No limit" option in #119.

## 2. API

Requests cannot be written directly: every change goes through these functions, called with `supabase.rpc`. They check who is calling with `auth.uid()`.

| Function | Who | What it does |
|---|---|---|
| `send_enrolment_request(p_activity_id, p_family_profile_id, p_message?)` | Family | Creates a pending request and returns its id. The message is optional (max 1000). |
| `cancel_enrolment_request(p_request_id)` | Family | Cancels a pending or accepted request. |
| `my_enrolment_requests(p_limit?, p_offset?)` | Family | Its requests, newest first, with the activity title, whether it is still available, the profile name and the status. |
| `accept_enrolment_request(p_request_id)` | Provider | Accepts a pending request if there are places. |
| `reject_enrolment_request(p_request_id)` | Provider | Rejects a pending request. |
| `provider_enrolment_requests(p_activity_id?, p_status?, p_limit?, p_offset?)` | Provider | Requests for its activities, pending first, optionally for one activity or one status. |
| `activity_capacity(p_activity_id)` | Anyone | `max_participants`, `taken_places` and `available_places` (both limits empty when there is no limit). |

Lists return 20 rows by default and 100 at most.

**What the provider sees** (team decision): the first name and age of the profile (`family_profile_age` from the date of birth, or `family_profile_age_range` when there is none) and the email of the family, so the provider can contact them. Only for requests to its own activities.

**What the family sees:** `activity_available` is `false` when the activity has been unpublished or has finished, so the list can say so instead of hiding the request.

### Errors

| Message | When |
|---|---|
| `This activity is not available for enrolment` | Not published, finished or not found |
| `This family profile already has a request for this activity` | The profile already has a pending or accepted request |
| `This activity is full` | No places left when sending |
| `There are no places left in this activity` | No places left when accepting |
| `Family profile is not accessible` | The profile belongs to another family |
| `Only customer accounts can request enrolment` | A provider tries to send a request |
| `Only pending requests can be accepted` / `rejected` | Wrong status change |
| `Only pending or accepted requests can be cancelled` | Wrong status change |
| `Not the activity provider` / `Not the requesting customer` | The request belongs to someone else |

## 3. Files

| File | Content |
|---|---|
| `…_create_sprint2_tables.sql`, `…_enrolments_publication_and_capacity.sql` | (C11) The table, its RLS and the first version of the functions. |
| `…_make_participant_limit_explicit.sql` | `unlimited_participants` and the explicit limit. |
| `…_enrolment_request_rules.sql` | The rules above and the clear messages. |
| `…_list_enrolment_requests.sql` | `my_enrolment_requests` and `provider_enrolment_requests`. |

## 4. Tests

- `supabase/tests/enrolment_requests.sql`: every rule, status change and permission, the places and the lists (40 checks, rolled back). Run it as its header explains.
- `supabase/tests/enrolment_concurrency.sh`: two sessions accept the last place at the same time and only one gets it. It needs two connections, so it commits its own data and deletes it at the end.

## 5. Pending

- Customer screens (#118) and provider screens (#119), including the "No limit" option.
- `provider_enrolled_family_profiles` (C11) returns only accepted profiles; `provider_enrolment_requests` covers every status.
