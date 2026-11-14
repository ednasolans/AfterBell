-- #119: places of the provider's activities, and a maximum that cannot go
-- below the accepted participants.
-- Run on the local database; everything is rolled back:
--   docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/provider_capacities.sql
-- Every line of the result must start with "ok".

\set QUIET on
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

BEGIN;

-- Two clubs and one family with three children
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
    ('ca000000-0000-0000-0000-00000000000a', 'cap-club-a@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('ca000000-0000-0000-0000-00000000000b', 'cap-club-b@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('ca000000-0000-0000-0000-0000000000f1', 'cap-family@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated');

INSERT INTO public.family_profiles (id, family_group_id, first_name, age_range)
SELECT v.id::uuid, m.family_group_id, v.name, '7-9'
FROM (VALUES
    ('ce000000-0000-0000-0000-000000000001', 'Anna'),
    ('ce000000-0000-0000-0000-000000000002', 'Pau'),
    ('ce000000-0000-0000-0000-000000000003', 'Marc')
) AS v(id, name)
JOIN public.family_group_members m ON m.account_id = 'ca000000-0000-0000-0000-0000000000f1';

INSERT INTO public.addresses (id, provider_id, street, number, postal_code, city, province, country) VALUES
    ('cb000000-0000-0000-0000-00000000000a', 'ca000000-0000-0000-0000-00000000000a', 'C/ Major', '1', '25001', 'Lleida', 'Lleida', 'Spain'),
    ('cb000000-0000-0000-0000-00000000000b', 'ca000000-0000-0000-0000-00000000000b', 'C/ Major', '2', '25001', 'Lleida', 'Lleida', 'Spain');
INSERT INTO public.technical_sheets (provider_id, name, provider_type, activity_types, address_id, email) VALUES
    ('ca000000-0000-0000-0000-00000000000a', 'Club A', 'sports_club', '{football}', 'cb000000-0000-0000-0000-00000000000a', 'a@test.com'),
    ('ca000000-0000-0000-0000-00000000000b', 'Club B', 'sports_club', '{football}', 'cb000000-0000-0000-0000-00000000000b', 'b@test.com');

INSERT INTO public.activities (
    id, provider_id, address_id, title, category, target_age_ranges, schedule,
    price, price_period, max_participants, unlimited_participants, status
)
SELECT v.id::uuid, v.provider::uuid, v.address::uuid, v.title, 'football', '{7-9}',
       '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 10, 'per_month',
       v.max_places, v.max_places IS NULL, 'published'
FROM (VALUES
    ('cd000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-00000000000a', 'cb000000-0000-0000-0000-00000000000a', 'Football', 5),
    ('cd000000-0000-0000-0000-000000000002', 'ca000000-0000-0000-0000-00000000000a', 'cb000000-0000-0000-0000-00000000000a', 'Basketball', NULL::integer),
    ('cd000000-0000-0000-0000-000000000003', 'ca000000-0000-0000-0000-00000000000b', 'cb000000-0000-0000-0000-00000000000b', 'Other club', 10)
) AS v(id, provider, address, title, max_places);

-- Football: two accepted and one pending. Basketball: one accepted.
INSERT INTO public.enrolment_requests (activity_id, customer_id, family_profile_id, status)
VALUES
    ('cd000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-0000000000f1', 'ce000000-0000-0000-0000-000000000001', 'accepted'),
    ('cd000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-0000000000f1', 'ce000000-0000-0000-0000-000000000002', 'accepted'),
    ('cd000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-0000000000f1', 'ce000000-0000-0000-0000-000000000003', 'pending'),
    ('cd000000-0000-0000-0000-000000000002', 'ca000000-0000-0000-0000-0000000000f1', 'ce000000-0000-0000-0000-000000000001', 'accepted');

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

-- ----------------------------------------------------------------- capacities
DO $$ BEGIN PERFORM pg_temp.login('ca000000-0000-0000-0000-00000000000a'); END $$;
SET LOCAL ROLE authenticated;

SELECT pg_temp.check('the provider sees the places of each of its activities, by title',
    (SELECT string_agg(activity_title || ':' || coalesce(max_participants::text, 'none') || '/'
        || taken_places || '/' || coalesce(available_places::text, 'none'), ', ')
     FROM public.provider_activity_capacities()),
    'Basketball:none/1/none, Football:5/2/3');

RESET ROLE;
DO $$ BEGIN PERFORM pg_temp.login('ca000000-0000-0000-0000-00000000000b'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.check('another provider only sees its own activities',
    (SELECT string_agg(activity_title || ':' || taken_places, ', ')
     FROM public.provider_activity_capacities()),
    'Other club:0');

RESET ROLE;
DO $$ BEGIN PERFORM pg_temp.login('ca000000-0000-0000-0000-0000000000f1'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.check('a family has no activities',
    (SELECT count(*)::text FROM public.provider_activity_capacities()), '0');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.expect('an anonymous user cannot read the places',
    $q$SELECT * FROM public.provider_activity_capacities()$q$,
    'permission denied for function provider_activity_capacities');

-- ----------------------------------------------------------------- maximum
RESET ROLE;
DO $$ BEGIN PERFORM pg_temp.login('ca000000-0000-0000-0000-00000000000a'); END $$;
SET LOCAL ROLE authenticated;

SELECT pg_temp.expect('the maximum cannot go below the accepted participants',
    $q$UPDATE public.activities SET max_participants = 1
       WHERE id = 'cd000000-0000-0000-0000-000000000001'$q$,
    'There are already 2 accepted participants');
SELECT pg_temp.expect('the maximum can be the number of accepted participants',
    $q$UPDATE public.activities SET max_participants = 2
       WHERE id = 'cd000000-0000-0000-0000-000000000001'$q$);
SELECT pg_temp.check('a full activity has no places left',
    (SELECT available_places::text FROM public.provider_activity_capacities()
     WHERE activity_title = 'Football'),
    '0');
SELECT pg_temp.expect('other fields can change while the activity is full',
    $q$UPDATE public.activities SET title = 'Football', max_participants = 2
       WHERE id = 'cd000000-0000-0000-0000-000000000001'$q$);
SELECT pg_temp.expect('the maximum can go up',
    $q$UPDATE public.activities SET max_participants = 8
       WHERE id = 'cd000000-0000-0000-0000-000000000001'$q$);
SELECT pg_temp.expect('an activity can switch to no limit',
    $q$UPDATE public.activities SET max_participants = NULL, unlimited_participants = true
       WHERE id = 'cd000000-0000-0000-0000-000000000001'$q$);
SELECT pg_temp.expect('an activity without limit cannot get a maximum below the accepted ones',
    $q$UPDATE public.activities SET max_participants = 0, unlimited_participants = false
       WHERE id = 'cd000000-0000-0000-0000-000000000002'$q$,
    'There are already 1 accepted participants');
SELECT pg_temp.expect('an activity without limit can get a maximum',
    $q$UPDATE public.activities SET max_participants = 3, unlimited_participants = false
       WHERE id = 'cd000000-0000-0000-0000-000000000002'$q$);

ROLLBACK;
