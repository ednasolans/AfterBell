-- #117: enrolment requests, their states, permissions and capacity.
-- Run on the local database; everything is rolled back:
--   docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/enrolment_requests.sql
-- Every line of the result must start with "ok".
-- Simultaneous acceptances are tested in enrolment_concurrency.sh.

\set QUIET on
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

BEGIN;

-- Two clubs and two families (family A has two children)
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
    ('c9000000-0000-0000-0000-00000000000a', 'enrol-club-a@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('c9000000-0000-0000-0000-00000000000b', 'enrol-club-b@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('c9000000-0000-0000-0000-0000000000f1', 'enrol-family-a@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated'),
    ('c9000000-0000-0000-0000-0000000000f2', 'enrol-family-b@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated');

INSERT INTO public.family_profiles (id, family_group_id, first_name, date_of_birth)
SELECT v.id::uuid, m.family_group_id, v.name, v.birth::date
FROM (VALUES
    ('a1000000-0000-0000-0000-000000000001', 'c9000000-0000-0000-0000-0000000000f1', 'Anna', '2018-03-01'),
    ('a1000000-0000-0000-0000-000000000002', 'c9000000-0000-0000-0000-0000000000f1', 'Pau', '2019-06-15'),
    ('a1000000-0000-0000-0000-000000000003', 'c9000000-0000-0000-0000-0000000000f2', 'Marc', '2017-01-10')
) AS v(id, account, name, birth)
JOIN public.family_group_members m ON m.account_id = v.account::uuid;

INSERT INTO public.addresses (id, provider_id, street, number, postal_code, city, province, country) VALUES
    ('b9000000-0000-0000-0000-00000000000a', 'c9000000-0000-0000-0000-00000000000a', 'C/ Major', '1', '25001', 'Lleida', 'Lleida', 'Spain');
INSERT INTO public.technical_sheets (provider_id, name, provider_type, activity_types, address_id, email)
VALUES ('c9000000-0000-0000-0000-00000000000a', 'Club A', 'sports_club', '{football}', 'b9000000-0000-0000-0000-00000000000a', 'club-a@test.com');

-- Activities of club A: one place, no limit, a draft and a finished one
INSERT INTO public.activities (
    id, provider_id, address_id, title, category, target_age_ranges, schedule,
    price, price_period, max_participants, unlimited_participants, status
)
SELECT v.id::uuid, 'c9000000-0000-0000-0000-00000000000a', 'b9000000-0000-0000-0000-00000000000a',
       v.title, 'football', '{7-9}', '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]',
       10, 'per_month', v.max_places, v.max_places IS NULL, v.status
FROM (VALUES
    ('d9000000-0000-0000-0000-000000000001', 'One place', 1, 'published'),
    ('d9000000-0000-0000-0000-000000000002', 'No limit', NULL::integer, 'published'),
    ('d9000000-0000-0000-0000-000000000003', 'Draft', 5, 'draft')
) AS v(id, title, max_places, status);

ALTER TABLE public.activities DISABLE TRIGGER activities_validate_dates;
INSERT INTO public.activities (
    id, provider_id, address_id, title, category, type, start_date, end_date,
    target_age_ranges, schedule, price, price_period, max_participants, status
) VALUES (
    'd9000000-0000-0000-0000-000000000004', 'c9000000-0000-0000-0000-00000000000a',
    'b9000000-0000-0000-0000-00000000000a', 'Finished camp', 'football', 'temporary',
    current_date - 10, current_date - 1, '{7-9}',
    '[{"day":"monday","startTime":"10:00","endTime":"12:00"}]', 10, 'per_week', 5, 'published'
);
ALTER TABLE public.activities ENABLE TRIGGER activities_validate_dates;

-- Runs a statement and prints "ok" if it fails with the expected message,
-- or if it succeeds when no message is expected
CREATE FUNCTION pg_temp.expect(p_name text, p_sql text, p_message text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
    EXECUTE p_sql;
    IF p_message IS NULL THEN RETURN 'ok   ' || p_name; END IF;
    RETURN 'FAIL ' || p_name || ': no error';
EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = p_message THEN RETURN 'ok   ' || p_name; END IF;
    RETURN 'FAIL ' || p_name || ': ' || SQLERRM;
END;
$$;

-- Compares a value read with a query
CREATE FUNCTION pg_temp.check(p_name text, p_actual text, p_expected text)
RETURNS text LANGUAGE sql AS $$
    SELECT CASE WHEN p_actual IS NOT DISTINCT FROM p_expected THEN 'ok   ' || p_name
                ELSE 'FAIL ' || p_name || ': got ' || coalesce(p_actual, 'NULL') END;
$$;

CREATE FUNCTION pg_temp.login(p_user text)
RETURNS void LANGUAGE sql AS $$
    SELECT set_config('request.jwt.claims',
        json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- Ids are kept here so later steps can use them
CREATE TEMP TABLE ids (name text PRIMARY KEY, id uuid);
GRANT ALL ON ids TO authenticated;

-- ----------------------------------------------------------------- limit
SELECT pg_temp.expect('a limit can be left empty only on purpose',
    $q$INSERT INTO public.activities (provider_id, address_id, title, category, target_age_ranges,
        schedule, price, price_period, max_participants)
       VALUES ('c9000000-0000-0000-0000-00000000000a', 'b9000000-0000-0000-0000-00000000000a',
        'x', 'football', '{7-9}', '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]',
        10, 'per_month', NULL)$q$,
    'new row for relation "activities" violates check constraint "activities_participant_limit_is_explicit"');
SELECT pg_temp.expect('an activity without limit cannot have a maximum',
    $q$UPDATE public.activities SET max_participants = 5
       WHERE id = 'd9000000-0000-0000-0000-000000000002'$q$,
    'new row for relation "activities" violates check constraint "activities_participant_limit_is_explicit"');

-- ----------------------------------------------------------------- sending
DO $$ BEGIN PERFORM pg_temp.login('c9000000-0000-0000-0000-0000000000f1'); END $$;
SET LOCAL ROLE authenticated;

SELECT pg_temp.expect('a family sends a request',
    $q$INSERT INTO ids VALUES ('anna_one', public.send_enrolment_request(
        'd9000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '  Hello  '))$q$);
SELECT pg_temp.check('the message is saved without spaces',
    (SELECT message FROM public.enrolment_requests WHERE id = (SELECT id FROM ids WHERE name = 'anna_one')),
    'Hello');
SELECT pg_temp.check('a new request is pending',
    (SELECT status FROM public.enrolment_requests WHERE id = (SELECT id FROM ids WHERE name = 'anna_one')),
    'pending');
SELECT pg_temp.expect('the same profile cannot ask twice',
    $q$SELECT public.send_enrolment_request('d9000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001')$q$,
    'This family profile already has a request for this activity');
SELECT pg_temp.expect('another child of the family can ask',
    $q$INSERT INTO ids VALUES ('pau_one', public.send_enrolment_request(
        'd9000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002'))$q$);
SELECT pg_temp.expect('the profile of another family is rejected',
    $q$SELECT public.send_enrolment_request('d9000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000003')$q$,
    'Family profile is not accessible');
SELECT pg_temp.expect('a draft activity does not accept requests',
    $q$SELECT public.send_enrolment_request('d9000000-0000-0000-0000-000000000003',
        'a1000000-0000-0000-0000-000000000001')$q$,
    'This activity is not available for enrolment');
SELECT pg_temp.expect('a finished activity does not accept requests',
    $q$SELECT public.send_enrolment_request('d9000000-0000-0000-0000-000000000004',
        'a1000000-0000-0000-0000-000000000001')$q$,
    'This activity is not available for enrolment');
SELECT pg_temp.expect('a request cannot be inserted directly',
    $q$INSERT INTO public.enrolment_requests (activity_id, customer_id, family_profile_id)
       VALUES ('d9000000-0000-0000-0000-000000000001', 'c9000000-0000-0000-0000-0000000000f1',
        'a1000000-0000-0000-0000-000000000001')$q$,
    'permission denied for table enrolment_requests');

RESET ROLE;
DO $$ BEGIN PERFORM pg_temp.login('c9000000-0000-0000-0000-00000000000a'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect('a provider cannot send requests',
    $q$SELECT public.send_enrolment_request('d9000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001')$q$,
    'Only customer accounts can request enrolment');

-- ----------------------------------------------------------------- provider
SELECT pg_temp.check('the provider sees the pending requests with name, age and email',
    (SELECT string_agg(family_profile_name || '/' || family_profile_age::text
        || '/' || customer_email, ', ' ORDER BY family_profile_name)
     FROM public.provider_enrolment_requests('d9000000-0000-0000-0000-000000000001')),
    'Anna/' || extract(year FROM age(current_date, DATE '2018-03-01'))::text
        || '/enrol-family-a@test.com, Pau/'
        || extract(year FROM age(current_date, DATE '2019-06-15'))::text || '/enrol-family-a@test.com');
SELECT pg_temp.expect('the provider accepts a pending request',
    $q$SELECT public.accept_enrolment_request((SELECT id FROM ids WHERE name = 'anna_one'))$q$);
SELECT pg_temp.check('accepted requests take a place',
    (SELECT taken_places || '/' || available_places FROM public.activity_capacity('d9000000-0000-0000-0000-000000000001')),
    '1/0');
SELECT pg_temp.expect('no place is left for the second child',
    $q$SELECT public.accept_enrolment_request((SELECT id FROM ids WHERE name = 'pau_one'))$q$,
    'There are no places left in this activity');
SELECT pg_temp.expect('an accepted request cannot be accepted again',
    $q$SELECT public.accept_enrolment_request((SELECT id FROM ids WHERE name = 'anna_one'))$q$,
    'Only pending requests can be accepted');
SELECT pg_temp.expect('an accepted request cannot be rejected',
    $q$SELECT public.reject_enrolment_request((SELECT id FROM ids WHERE name = 'anna_one'))$q$,
    'Only pending requests can be rejected');
SELECT pg_temp.check('the provider filters by status, pending first',
    (SELECT string_agg(family_profile_name || ':' || status, ', ')
     FROM public.provider_enrolment_requests('d9000000-0000-0000-0000-000000000001')),
    'Pau:pending, Anna:accepted');
SELECT pg_temp.check('the status filter returns only that status',
    (SELECT string_agg(family_profile_name, ', ')
     FROM public.provider_enrolment_requests(NULL, 'accepted')),
    'Anna');
SELECT pg_temp.expect('the provider rejects a pending request',
    $q$SELECT public.reject_enrolment_request((SELECT id FROM ids WHERE name = 'pau_one'))$q$);
SELECT pg_temp.expect('a rejected request cannot be accepted',
    $q$SELECT public.accept_enrolment_request((SELECT id FROM ids WHERE name = 'pau_one'))$q$,
    'Only pending requests can be accepted');
SELECT pg_temp.expect('the provider cannot cancel requests',
    $q$SELECT public.cancel_enrolment_request((SELECT id FROM ids WHERE name = 'anna_one'))$q$,
    'Not the requesting customer');

-- ----------------------------------------------------------------- full and no limit
RESET ROLE;
DO $$ BEGIN PERFORM pg_temp.login('c9000000-0000-0000-0000-0000000000f2'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect('a full activity does not accept requests',
    $q$SELECT public.send_enrolment_request('d9000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000003')$q$,
    'This activity is full');
SELECT pg_temp.expect('an activity without limit accepts requests',
    $q$INSERT INTO ids VALUES ('marc_free', public.send_enrolment_request(
        'd9000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003'))$q$);
SELECT pg_temp.check('a family only sees its own requests',
    (SELECT string_agg(family_profile_name || ':' || activity_title, ', ')
     FROM public.my_enrolment_requests()),
    'Marc:No limit');
SELECT pg_temp.check('a family cannot read the requests of another one',
    (SELECT count(*)::text FROM public.enrolment_requests
     WHERE customer_id = 'c9000000-0000-0000-0000-0000000000f1'),
    '0');
SELECT pg_temp.expect('a family cannot cancel the request of another one',
    $q$SELECT public.cancel_enrolment_request((SELECT id FROM ids WHERE name = 'anna_one'))$q$,
    'Not the requesting customer');

RESET ROLE;
DO $$ BEGIN PERFORM pg_temp.login('c9000000-0000-0000-0000-00000000000b'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect('another provider cannot accept the request',
    $q$SELECT public.accept_enrolment_request((SELECT id FROM ids WHERE name = 'marc_free'))$q$,
    'Not the activity provider');
SELECT pg_temp.expect('another provider cannot reject the request',
    $q$SELECT public.reject_enrolment_request((SELECT id FROM ids WHERE name = 'marc_free'))$q$,
    'Not the activity provider');
SELECT pg_temp.check('another provider sees no requests',
    (SELECT count(*)::text FROM public.provider_enrolment_requests()),
    '0');

RESET ROLE;
DO $$ BEGIN PERFORM pg_temp.login('c9000000-0000-0000-0000-00000000000a'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect('a request for an activity without limit is accepted',
    $q$SELECT public.accept_enrolment_request((SELECT id FROM ids WHERE name = 'marc_free'))$q$);
SELECT pg_temp.check('an activity without limit has no available count',
    (SELECT coalesce(max_participants::text, 'none') || '/' || taken_places || '/'
        || coalesce(available_places::text, 'none')
     FROM public.activity_capacity('d9000000-0000-0000-0000-000000000002')),
    'none/1/none');

-- ----------------------------------------------------------------- cancelling
RESET ROLE;
DO $$ BEGIN PERFORM pg_temp.login('c9000000-0000-0000-0000-0000000000f1'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect('a family cancels its accepted request',
    $q$SELECT public.cancel_enrolment_request((SELECT id FROM ids WHERE name = 'anna_one'))$q$);
SELECT pg_temp.check('cancelling releases the place',
    (SELECT taken_places || '/' || available_places FROM public.activity_capacity('d9000000-0000-0000-0000-000000000001')),
    '0/1');
SELECT pg_temp.expect('a cancelled request cannot be cancelled again',
    $q$SELECT public.cancel_enrolment_request((SELECT id FROM ids WHERE name = 'anna_one'))$q$,
    'Only pending or accepted requests can be cancelled');
SELECT pg_temp.expect('a rejected request cannot be cancelled',
    $q$SELECT public.cancel_enrolment_request((SELECT id FROM ids WHERE name = 'pau_one'))$q$,
    'Only pending or accepted requests can be cancelled');
SELECT pg_temp.expect('after cancelling, the profile can ask again',
    $q$SELECT public.send_enrolment_request('d9000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001')$q$);
SELECT pg_temp.check('the family list says when an activity is no longer available',
    (SELECT string_agg(activity_title || ':' || activity_available, ', ' ORDER BY activity_title)
     FROM (SELECT DISTINCT activity_title, activity_available FROM public.my_enrolment_requests()) x),
    'One place:true');

RESET ROLE;
UPDATE public.activities SET status = 'draft' WHERE id = 'd9000000-0000-0000-0000-000000000001';
DO $$ BEGIN PERFORM pg_temp.login('c9000000-0000-0000-0000-0000000000f1'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.check('an unpublished activity stays in the list, marked',
    (SELECT string_agg(DISTINCT activity_title || ':' || activity_available, ', ')
     FROM public.my_enrolment_requests()),
    'One place:false');

ROLLBACK;
