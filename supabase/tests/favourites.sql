-- #116: favourites, their permissions and the list of a family profile.
-- Since #104 favourites belong to a family profile, not to the account.
-- Run on the local database; everything is rolled back:
--   docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/favourites.sql
-- Every line of the result must start with "ok".

\set QUIET on
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

BEGIN;

-- Club A has an approved profile, club B does not. Two families.
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
    ('fa000000-0000-0000-0000-00000000000a', 'fav-club-a@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('fa000000-0000-0000-0000-00000000000b', 'fav-club-b@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('fa000000-0000-0000-0000-0000000000f1', 'fav-family-a@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated'),
    ('fa000000-0000-0000-0000-0000000000f2', 'fav-family-b@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated'),
    ('fa000000-0000-0000-0000-0000000000f3', 'fav-parent-a2@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated');

-- The second parent joins family A (each account gets its own group on sign up)
UPDATE public.family_group_members
SET family_group_id = (SELECT family_group_id FROM public.family_group_members
                       WHERE account_id = 'fa000000-0000-0000-0000-0000000000f1')
WHERE account_id = 'fa000000-0000-0000-0000-0000000000f3';

-- Family A has two children, Marc and Laia; family B has one, Pol
INSERT INTO public.family_profiles (id, family_group_id, first_name, date_of_birth)
SELECT v.id::uuid, m.family_group_id, v.name, DATE '2018-03-01'
FROM (VALUES
    ('fc000000-0000-0000-0000-0000000000a1', 'fa000000-0000-0000-0000-0000000000f1', 'Marc'),
    ('fc000000-0000-0000-0000-0000000000a2', 'fa000000-0000-0000-0000-0000000000f1', 'Laia'),
    ('fc000000-0000-0000-0000-0000000000b1', 'fa000000-0000-0000-0000-0000000000f2', 'Pol')
) AS v(id, account, name)
JOIN public.family_group_members m ON m.account_id = v.account::uuid;

INSERT INTO public.provider_profiles (provider_id, headline, description, model, status, approved_at, approved_headline, approved_description)
VALUES ('fa000000-0000-0000-0000-00000000000a', 'Club A', 'Football club', 'test', 'approved', now(), 'Club A', 'Football club');

INSERT INTO public.addresses (id, provider_id, street, number, postal_code, city, province, country) VALUES
    ('fb000000-0000-0000-0000-00000000000a', 'fa000000-0000-0000-0000-00000000000a', 'C/ Major', '1', '25001', 'Lleida', 'Lleida', 'Spain'),
    ('fb000000-0000-0000-0000-00000000000b', 'fa000000-0000-0000-0000-00000000000b', 'C/ Major', '2', '25001', 'Lleida', 'Lleida', 'Spain');

-- Two sheets for club A: the list uses the newest name
INSERT INTO public.technical_sheets (provider_id, name, provider_type, activity_types, address_id, email, created_at) VALUES
    ('fa000000-0000-0000-0000-00000000000a', 'Old name', 'sports_club', '{football}', 'fb000000-0000-0000-0000-00000000000a', 'a@test.com', now() - interval '1 day'),
    ('fa000000-0000-0000-0000-00000000000a', 'Club A', 'sports_club', '{football}', 'fb000000-0000-0000-0000-00000000000a', 'a@test.com', now()),
    ('fa000000-0000-0000-0000-00000000000b', 'Club B', 'sports_club', '{football}', 'fb000000-0000-0000-0000-00000000000b', 'b@test.com', now());

INSERT INTO public.activities (
    id, provider_id, address_id, title, category, target_age_ranges, schedule,
    price, price_period, max_participants, status
)
SELECT v.id::uuid, v.provider::uuid, v.address::uuid, v.title, 'football', '{7-9}',
       '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 10, 'per_month', 10, v.status
FROM (VALUES
    ('fd000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-00000000000a', 'fb000000-0000-0000-0000-00000000000a', 'Football', 'published'),
    ('fd000000-0000-0000-0000-000000000002', 'fa000000-0000-0000-0000-00000000000a', 'fb000000-0000-0000-0000-00000000000a', 'Draft', 'draft'),
    ('fd000000-0000-0000-0000-000000000003', 'fa000000-0000-0000-0000-00000000000b', 'fb000000-0000-0000-0000-00000000000b', 'Not approved', 'published')
) AS v(id, provider, address, title, status);

ALTER TABLE public.activities DISABLE TRIGGER activities_validate_dates;
INSERT INTO public.activities (
    id, provider_id, address_id, title, category, type, start_date, end_date,
    target_age_ranges, schedule, price, price_period, max_participants, status
) VALUES (
    'fd000000-0000-0000-0000-000000000004', 'fa000000-0000-0000-0000-00000000000a',
    'fb000000-0000-0000-0000-00000000000a', 'Finished camp', 'football', 'temporary',
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

-- ----------------------------------------------------------------- adding
DO $$ BEGIN PERFORM pg_temp.login('fa000000-0000-0000-0000-0000000000f1'); END $$;
SET LOCAL ROLE authenticated;

-- The dates are set so the order of the list can be checked
SELECT pg_temp.expect('a family saves a published activity for Marc',
    $q$INSERT INTO public.favourites (family_profile_id, activity_id, created_at)
       VALUES ('fc000000-0000-0000-0000-0000000000a1', 'fd000000-0000-0000-0000-000000000001', now() - interval '3 hours')$q$);
SELECT pg_temp.expect('the same activity cannot be saved twice for the same child',
    $q$INSERT INTO public.favourites (family_profile_id, activity_id)
       VALUES ('fc000000-0000-0000-0000-0000000000a1', 'fd000000-0000-0000-0000-000000000001')$q$,
    'duplicate key value violates unique constraint "favourites_pkey"');
SELECT pg_temp.expect('the same activity can be saved for another child',
    $q$INSERT INTO public.favourites (family_profile_id, activity_id)
       VALUES ('fc000000-0000-0000-0000-0000000000a2', 'fd000000-0000-0000-0000-000000000001')$q$);
-- RLS rejects it before the NOT NULL of family_profile_id is checked
SELECT pg_temp.expect('a favourite needs a profile',
    $q$INSERT INTO public.favourites (activity_id) VALUES ('fd000000-0000-0000-0000-000000000004')$q$,
    'new row violates row-level security policy for table "favourites"');
SELECT pg_temp.expect('a draft activity cannot be saved',
    $q$INSERT INTO public.favourites (family_profile_id, activity_id)
       VALUES ('fc000000-0000-0000-0000-0000000000a1', 'fd000000-0000-0000-0000-000000000002')$q$,
    'new row violates row-level security policy for table "favourites"');
SELECT pg_temp.expect('a family cannot save for a child of another family',
    $q$INSERT INTO public.favourites (family_profile_id, activity_id)
       VALUES ('fc000000-0000-0000-0000-0000000000b1', 'fd000000-0000-0000-0000-000000000001')$q$,
    'new row violates row-level security policy for table "favourites"');
SELECT pg_temp.expect('a finished activity that is still published can be saved',
    $q$INSERT INTO public.favourites (family_profile_id, activity_id, created_at)
       VALUES ('fc000000-0000-0000-0000-0000000000a1', 'fd000000-0000-0000-0000-000000000004', now() - interval '2 hours')$q$);
SELECT pg_temp.expect('an activity of a provider without an approved profile can be saved',
    $q$INSERT INTO public.favourites (family_profile_id, activity_id, created_at)
       VALUES ('fc000000-0000-0000-0000-0000000000a1', 'fd000000-0000-0000-0000-000000000003', now() - interval '1 hour')$q$);

-- ----------------------------------------------------------------- listing
SELECT pg_temp.check('the list is newest first and says what is still available',
    (SELECT string_agg(title || ':' || available, ', ')
     FROM public.my_favourites('fc000000-0000-0000-0000-0000000000a1')),
    'Not approved:false, Finished camp:false, Football:true');
SELECT pg_temp.check('each child has their own list',
    (SELECT string_agg(title, ', ')
     FROM public.my_favourites('fc000000-0000-0000-0000-0000000000a2')),
    'Football');
SELECT pg_temp.check('the list has the name of the newest technical sheet',
    (SELECT provider_name FROM public.my_favourites('fc000000-0000-0000-0000-0000000000a1')
     WHERE title = 'Football'),
    'Club A');
SELECT pg_temp.check('the list has what the card needs',
    (SELECT category || '/' || type || '/' || array_to_string(target_age_ranges, ',') || '/'
        || price || '/' || price_period
     FROM public.my_favourites('fc000000-0000-0000-0000-0000000000a1') WHERE title = 'Football'),
    'football/whole_year/7-9/10.00/per_month');
SELECT pg_temp.check('the list is paginated',
    (SELECT string_agg(title, ', ')
     FROM public.my_favourites('fc000000-0000-0000-0000-0000000000a1', 1, 1)),
    'Finished camp');
SELECT pg_temp.check('the page size is at least one',
    (SELECT count(*)::text FROM public.my_favourites('fc000000-0000-0000-0000-0000000000a1', 0)),
    '1');

-- ----------------------------------------------------------------- second parent
RESET ROLE;
DO $$ BEGIN PERFORM pg_temp.login('fa000000-0000-0000-0000-0000000000f3'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.check('the other parent sees the favourites of the children',
    (SELECT count(*)::text FROM public.my_favourites('fc000000-0000-0000-0000-0000000000a1')),
    '3');
SELECT pg_temp.expect('the other parent saves for a child of the family',
    $q$INSERT INTO public.favourites (family_profile_id, activity_id)
       VALUES ('fc000000-0000-0000-0000-0000000000a2', 'fd000000-0000-0000-0000-000000000004')$q$);

-- ----------------------------------------------------------------- privacy
RESET ROLE;
DO $$ BEGIN PERFORM pg_temp.login('fa000000-0000-0000-0000-0000000000f2'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.check('another family does not see the favourites',
    (SELECT count(*)::text FROM public.favourites), '0');
SELECT pg_temp.check('another family gets an empty list for a child of family A',
    (SELECT count(*)::text FROM public.my_favourites('fc000000-0000-0000-0000-0000000000a1')),
    '0');
SELECT pg_temp.expect('another family tries to delete the favourites',
    $q$DELETE FROM public.favourites$q$);

RESET ROLE;
SELECT pg_temp.check('the favourites of the first family are still there',
    (SELECT count(*)::text FROM public.favourites
     WHERE family_profile_id IN ('fc000000-0000-0000-0000-0000000000a1',
                                 'fc000000-0000-0000-0000-0000000000a2')), '5');

DO $$ BEGIN PERFORM pg_temp.login('fa000000-0000-0000-0000-00000000000a'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect('a provider cannot save favourites',
    $q$INSERT INTO public.favourites (family_profile_id, activity_id)
       VALUES ('fc000000-0000-0000-0000-0000000000a1', 'fd000000-0000-0000-0000-000000000001')$q$,
    'new row violates row-level security policy for table "favourites"');
SELECT pg_temp.check('a provider gets an empty list',
    (SELECT count(*)::text FROM public.my_favourites('fc000000-0000-0000-0000-0000000000a1')),
    '0');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.expect('an anonymous user cannot read any list',
    $q$SELECT * FROM public.my_favourites('fc000000-0000-0000-0000-0000000000a1')$q$,
    'permission denied for function my_favourites');

-- ----------------------------------------------------------------- unpublished
RESET ROLE;
UPDATE public.activities SET status = 'draft' WHERE id = 'fd000000-0000-0000-0000-000000000001';
DO $$ BEGIN PERFORM pg_temp.login('fa000000-0000-0000-0000-0000000000f1'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.check('an unpublished activity stays in the list, marked',
    (SELECT title || ':' || available FROM public.my_favourites('fc000000-0000-0000-0000-0000000000a1')
     WHERE title = 'Football'),
    'Football:false');

-- ----------------------------------------------------------------- removing
SELECT pg_temp.expect('a family removes a favourite of Marc, even if no longer published',
    $q$DELETE FROM public.favourites
       WHERE family_profile_id = 'fc000000-0000-0000-0000-0000000000a1'
         AND activity_id = 'fd000000-0000-0000-0000-000000000001'$q$);
SELECT pg_temp.check('the removed favourite is gone for Marc',
    (SELECT string_agg(title, ', ') FROM public.my_favourites('fc000000-0000-0000-0000-0000000000a1')),
    'Not approved, Finished camp');
SELECT pg_temp.check('Laia keeps the same activity',
    (SELECT count(*)::text FROM public.my_favourites('fc000000-0000-0000-0000-0000000000a2')
     WHERE title = 'Football'),
    '1');

-- ----------------------------------------------------------------- deleting a profile
RESET ROLE;
DELETE FROM public.family_profiles WHERE id = 'fc000000-0000-0000-0000-0000000000a2';
SELECT pg_temp.check('deleting a profile deletes its favourites',
    (SELECT count(*)::text FROM public.favourites
     WHERE family_profile_id = 'fc000000-0000-0000-0000-0000000000a2'), '0');

ROLLBACK;
