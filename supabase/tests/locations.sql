-- #139: city and approximate point of a family, and points of the addresses.
-- Run on the local database; everything is rolled back:
--   docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/locations.sql
-- Every line of the result must start with "ok".

\set QUIET on
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

BEGIN;

-- One club and two families
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
    ('10c00000-0000-0000-0000-00000000000a', 'loc-club@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('10c00000-0000-0000-0000-0000000000f1', 'loc-family-a@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated'),
    ('10c00000-0000-0000-0000-0000000000f2', 'loc-family-b@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated');

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

-- Group of family A, read as admin
CREATE TEMP TABLE groups AS
SELECT account_id, family_group_id FROM public.family_group_members
WHERE account_id IN ('10c00000-0000-0000-0000-0000000000f1', '10c00000-0000-0000-0000-0000000000f2');
GRANT SELECT ON groups TO authenticated;

-- ----------------------------------------------------------------- family
DO $$ BEGIN PERFORM pg_temp.login('10c00000-0000-0000-0000-0000000000f1'); END $$;
SET LOCAL ROLE authenticated;

-- A point in Lleida, given with full GPS precision
SELECT pg_temp.expect('a family saves its city and position',
    $q$SELECT public.set_family_location('  Lleida  ', 41.617591, 0.620015)$q$);
SELECT pg_temp.check('the city is saved without spaces and members read it',
    (SELECT city FROM public.family_groups), 'Lleida');
SELECT pg_temp.check('the position is moved to the centre of a 0.015 degree cell',
    (SELECT round(extensions.ST_Y(location::extensions.geometry)::numeric, 3) || ','
        || round(extensions.ST_X(location::extensions.geometry)::numeric, 3)
     FROM public.family_groups),
    '41.625,0.615');
SELECT pg_temp.check('the saved position is never more than about 1 km from the real one',
    (SELECT (extensions.ST_Distance(location,
        extensions.ST_SetSRID(extensions.ST_MakePoint(0.620015, 41.617591), 4326)::extensions.geography) < 1100)::text
     FROM public.family_groups),
    'true');
SELECT pg_temp.expect('the city cannot be blank',
    $q$SELECT public.set_family_location('   ', 41.6, 0.6)$q$,
    'Enter your city or town');
SELECT pg_temp.expect('the city cannot be longer than 100 characters',
    $q$SELECT public.set_family_location(repeat('a', 101), 41.6, 0.6)$q$,
    'The city name is too long');
SELECT pg_temp.expect('a city of exactly 100 characters is accepted',
    $q$SELECT public.set_family_location(repeat('a', 100), 41.6, 0.6)$q$);
SELECT pg_temp.expect('the latitude must be valid',
    $q$SELECT public.set_family_location('Lleida', 91, 0.6)$q$,
    'The location is not valid');
SELECT pg_temp.expect('the longitude must be valid',
    $q$SELECT public.set_family_location('Lleida', 41.6, -181)$q$,
    'The location is not valid');
SELECT pg_temp.expect('the position is required',
    $q$SELECT public.set_family_location('Lleida', NULL, NULL)$q$,
    'The location is not valid');
SELECT pg_temp.expect('the group cannot be changed directly',
    $q$UPDATE public.family_groups SET city = 'Hacked'$q$,
    'permission denied for table family_groups');

-- ----------------------------------------------------------------- privacy
RESET ROLE;
DO $$ BEGIN PERFORM pg_temp.login('10c00000-0000-0000-0000-0000000000f2'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.check('another family cannot read the location',
    (SELECT count(*)::text FROM public.family_groups
     WHERE id = (SELECT family_group_id FROM groups
                 WHERE account_id = '10c00000-0000-0000-0000-0000000000f1')),
    '0');
SELECT pg_temp.expect('another family saves its own location',
    $q$SELECT public.set_family_location('Alpicat', 41.6667, 0.5567)$q$);

RESET ROLE;
SELECT pg_temp.check('each family only changed its own group',
    (SELECT string_agg(left(fg.city, 7), ', ' ORDER BY g.account_id)
     FROM groups g JOIN public.family_groups fg ON fg.id = g.family_group_id),
    'aaaaaaa, Alpicat');

DO $$ BEGIN PERFORM pg_temp.login('10c00000-0000-0000-0000-00000000000a'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect('a provider has no family location',
    $q$SELECT public.set_family_location('Lleida', 41.6, 0.6)$q$,
    'Only family accounts can save a location');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.expect('an anonymous user cannot save a location',
    $q$SELECT public.set_family_location('Lleida', 41.6, 0.6)$q$,
    'permission denied for function set_family_location');

RESET ROLE;
SELECT pg_temp.expect('a point needs a city',
    $q$UPDATE public.family_groups SET city = NULL
       WHERE id IN (SELECT family_group_id FROM groups)$q$,
    'new row for relation "family_groups" violates check constraint "family_groups_location_has_city"');

-- ----------------------------------------------------------------- addresses
DO $$ BEGIN PERFORM pg_temp.login('10c00000-0000-0000-0000-00000000000a'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect('a provider saves an address with its point, as the app sends it',
    $q$INSERT INTO public.addresses (id, street, number, postal_code, city, province, country, location)
       VALUES ('10a00000-0000-0000-0000-000000000001', 'C/ Major', '1', '25001', 'Lleida', 'Lleida',
               'Spain', 'SRID=4326;POINT(0.6262 41.6142)')$q$);
SELECT pg_temp.expect('an address can be saved without a point',
    $q$INSERT INTO public.addresses (street, number, postal_code, city, province, country)
       VALUES ('C/ Major', '2', '25001', 'Lleida', 'Lleida', 'Spain')$q$);
SELECT pg_temp.expect('the provider can change the point of its address',
    $q$UPDATE public.addresses SET location = 'SRID=4326;POINT(0.6263 41.6143)'
       WHERE id = '10a00000-0000-0000-0000-000000000001'$q$);

RESET ROLE;
DO $$ BEGIN PERFORM pg_temp.login('10c00000-0000-0000-0000-0000000000f2'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect('a family tries to move the address of a provider',
    $q$UPDATE public.addresses SET location = 'SRID=4326;POINT(0 0)'
       WHERE id = '10a00000-0000-0000-0000-000000000001'$q$);

RESET ROLE;
SELECT pg_temp.check('the address of the provider did not move',
    (SELECT round(extensions.ST_X(location::extensions.geometry)::numeric, 4)::text
     FROM public.addresses WHERE id = '10a00000-0000-0000-0000-000000000001'),
    '0.6263');
SELECT pg_temp.check('the distance from a family to an activity can be computed in km',
    (SELECT round((extensions.ST_Distance(fg.location, a.location) / 1000)::numeric)::text
     FROM public.family_groups fg, public.addresses a
     WHERE fg.id = (SELECT family_group_id FROM groups
                    WHERE account_id = '10c00000-0000-0000-0000-0000000000f2')
       AND a.id = '10a00000-0000-0000-0000-000000000001'),
    -- Alpicat, saved as (41.670, 0.555), to C/ Major 1 in Lleida
    '9');

ROLLBACK;
