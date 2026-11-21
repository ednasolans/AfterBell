# Feature guide: enrolment requests (C9)

Families ask for a place in an activity, and the provider accepts or rejects the request. This guide explains the backend (#117), the customer screens (#118), the provider screens (#119) and the decisions behind them.

## 1. Rules

- A request is for **one family profile**. A family that wants two children in an activity sends two requests, and each one is accepted or rejected on its own (team decision).
- Only **published** activities that have **not finished** accept requests.
- The family profile must belong to the family that sends the request.
- A profile can have only **one active request** (pending or accepted) per activity. After a rejection or a cancellation it can ask again.
- A **full** activity does not accept new requests (team decision): a pending request that can never be accepted would only confuse the family. When someone cancels, the place is free again.
- **One participant per accepted request.** Accepting checks the places inside a transaction that locks the activity row, so two simultaneous acceptances can never go over the maximum.
- Statuses: `pending` → `accepted` or `rejected` (provider); `pending` or `accepted` → `cancelled` (family, which frees the place). Any other change is rejected.

### No limit of participants

An activity can have no limit, but only on purpose (team decision): `max_participants` is empty only when `unlimited_participants` is `true`. The flag is `false` by default, so forgetting the maximum is rejected instead of meaning "no limit" (`activities_participant_limit_is_explicit`). Existing activities keep their limit. The form has a "No limit of participants" switch (#119).

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
| `provider_activity_capacities()` | Provider | The same for every activity of the provider, with its title, in one call (#119). |

Lists return 20 rows by default and 100 at most.

**What the provider sees** (team decision): the first name and age of the profile (`family_profile_age`, calculated from the date of birth) and the email of the family, so the provider can contact them. Only for requests to its own activities.

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
| `There are already N accepted participants` | The provider lowers the maximum below the accepted participants (#119, team decision) |

## 3. Files

| File | Content |
|---|---|
| `…_create_sprint2_tables.sql`, `…_enrolments_publication_and_capacity.sql` | (C11) The table, its RLS and the first version of the functions. |
| `…_make_participant_limit_explicit.sql` | `unlimited_participants` and the explicit limit. |
| `…_enrolment_request_rules.sql` | The rules above and the clear messages. |
| `…_list_enrolment_requests.sql` | `my_enrolment_requests` and `provider_enrolment_requests`. |
| `…_provider_capacities_and_limit_check.sql` | `provider_activity_capacities` and the trigger that keeps the maximum above the accepted participants (#119). |

## 4. Tests

- `supabase/tests/enrolment_requests.sql`: every rule, status change and permission, the places and the lists (40 checks, rolled back). Run it as its header explains.
- `supabase/tests/provider_capacities.sql`: the places of each activity of the provider, who can read them, and every way of changing the maximum (12 checks, rolled back).
- `supabase/tests/enrolment_concurrency.sh`: two sessions accept the last place at the same time and only one gets it. It needs two connections, so it commits its own data and deletes it at the end.

## 5. Customer screens (#118)

The code lives in `mobile/src/features/enrolments/`. The activity detail (catalog feature) gets the enrolment part through `renderFooter`, so the two features do not import each other: the screen `app/(customer)/activities/[id].tsx` joins them.

- **Activity detail:** shows the enrolled people and the places left, the family's requests for this activity with their status, and *Request enrolment*. The button is replaced by a message when the activity has finished or is full, when every profile already has a request, or when the family has no profiles (with a link to add one).
- **Request form:** opens under the button, without leaving the detail. The family chooses one or more profiles (only those without an active request) and can write a message. One request is sent per profile; if one fails, the ones sent before are kept and the error is shown.
- **My requests** (`/my-requests`, *Requests* in the bottom bar): every request with its activity, profile, date and status, *No longer available* for activities that were unpublished or finished, and *Cancel request* with a confirmation for pending and accepted ones. It reloads when the family comes back to the screen and with pull to refresh.
- **Statuses** have an icon and a text, so they do not rely on colour alone.
- **Errors:** only the messages written for the family are shown (`enrolmentErrors.ts`); anything else becomes a generic text.

| File | Content |
|---|---|
| `types.ts` | Statuses and labels, `EnrolmentRequest`, `EnrolmentProfile`, the form. |
| `enrolmentRules.ts` | Whether an activity accepts requests (finished, full) and which profiles can still ask. |
| `validation.ts` | At least one profile, message up to 1000 characters. |
| `enrolmentErrors.ts` | Which errors are shown to the family. |
| `api/` | `fetchEnrolmentProfiles`, `fetchMyEnrolmentRequests`, `sendEnrolmentRequests`, `cancelEnrolmentRequest`. |
| `hooks/` | Queries, mutations and the form state. |
| `components/` | `RequestEnrolment`, `EnrolmentRequestForm`, `MyEnrolmentRequestsList`, `EnrolmentStatusBadge`. |

`isFinished` moved from the catalog to `lib/activity.ts`, because both features need it.

## 6. Provider screens (#119)

The provider part also lives in `features/enrolments/`. The list of activities (activities feature) gets the counter through `renderCardFooter`; the screen `app/(provider)/activities/index.tsx` joins the two features.

- **Enrolment requests** (`/requests`, a card on the provider home): every request received, pending first. Each one shows the first name and age of the profile, the activity with its places ("8 / 12" or "3 (no limit)"), the email of the family, the date, the message and the status.
- **Filters** by status (All by default) and by activity, as chips. Filtering by an activity shows its places on top ("Places taken: 8 / 12 · Full").
- **Accept / Reject** only for pending requests, after a confirmation. When the activity is full, *Accept* is disabled and the card says why; *Reject* still works. If the last place was taken in the meantime, the message of the server is shown.
- **After answering**, the request and the counter change at once in the cache (`useAnswerEnrolmentRequest`), and then everything is read again in the background, without a loading screen. Changing a filter keeps the current list on screen while the new one loads.
- **My activities:** each card shows "Places: 8 / 12" (and *Full*). Pressing it opens the requests filtered by that activity.
- Loading, empty ("No requests match these filters" when filtering) and error states with *Try again*; pull to refresh; it reloads when the provider comes back to the screen.

| File | Content |
|---|---|
| `api/fetchReceivedEnrolmentRequests.ts`, `toReceivedEnrolmentRequest.ts` | The received requests, with the filters. |
| `api/fetchActivityPlaces.ts` | `provider_activity_capacities`. |
| `api/answerEnrolmentRequest.ts` | Accept or reject. |
| `enrolmentRules.ts` | `formatPlaces`, `isFullActivity`, `formatProfileAge`. |
| `hooks/useReceivedEnrolmentRequests.ts`, `useActivityPlaces.ts`, `useAnswerEnrolmentRequest.ts` | Queries and the mutation that updates the cache. |
| `components/ReceivedRequestsList.tsx`, `ActivityPlacesCounter.tsx` | The screen and the counter of the cards. |

### Maximum participants in the activity form

- **No limit of participants** is a switch next to the maximum. When it is on, the field is hidden and the activity is saved with `unlimited_participants = true` and no maximum. A saved activity without maximum opens with the switch on.
- The maximum cannot be lower than the accepted participants: the trigger `activities_participant_limit_above_accepted` rejects it with `There are already N accepted participants`, and the form shows that message.

## 7. Pending

- `provider_enrolled_family_profiles` (C11) returns only accepted profiles; `provider_enrolment_requests` covers every status.
