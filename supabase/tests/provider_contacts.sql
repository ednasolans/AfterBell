-- #71: customers read the contact details of a provider, never its technical sheet.
-- The catalog reads them through public_provider_contacts(), which returns only
-- name, email, phone and website of providers with a published activity.
-- Run on the local database; everything is rolled back:
--   docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/provider_contacts.sql
-- Every line of the result must start with "ok".

\set QUIET on
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

BEGIN;

-- Club A has a published activity, club B only a draft. One family.
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
    ('c7000000-0000-0000-0000-00000000000a', 'contact-club-a@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('c7000000-0000-0000-0000-00000000000b', 'contact-club-b@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('c7000000-0000-0000-0000-0000000000f1', 'contact-family@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated');

INSERT INTO public.addresses (id, provider_id, street, number, postal_code, city, province, country) VALUES
    ('c7100000-0000-0000-0000-00000000000a', 'c7000000-0000-0000-0000-00000000000a', 'C/ Major', '1', '25001', 'Lleida', 'Lleida', 'Spain'),
    ('c7100000-0000-0000-0000-00000000000b', 'c7000000-0000-0000-0000-00000000000b', 'C/ Major', '2', '25001', 'Lleida', 'Lleida', 'Spain');

-- Club A has an older sheet too: only the newest one is public
INSERT INTO public.technical_sheets (provider_id, name, provider_type, activity_types, address_id, email, phone_number, website, created_at) VALUES
    ('c7000000-0000-0000-0000-00000000000a', 'Old name', 'sports_club', '{football}', 'c7100000-0000-0000-0000-00000000000a', 'old@test.com', NULL, NULL, now() - interval '1 day'),
    ('c7000000-0000-0000-0000-00000000000a', 'Club A', 'sports_club', '{football}', 'c7100000-0000-0000-0000-00000000000a', 'a@test.com', '600000000', 'https://club-a.test', now()),
    ('c7000000-0000-0000-0000-00000000000b', 'Club B', 'sports_club', '{football}', 'c7100000-0000-0000-0000-00000000000b', 'b@test.com', NULL, NULL, now());

INSERT INTO public.activities (
    provider_id, address_id, title, category, target_age_ranges, schedule,
    price, price_period, max_participants, status
)
SELECT v.provider::uuid, v.address::uuid, v.title, 'football', '{7-9}',
       '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 10, 'per_month', 10, v.status
FROM (VALUES
    ('c7000000-0000-0000-0000-00000000000a', 'c7100000-0000-0000-0000-00000000000a', 'Football', 'published'),
    ('c7000000-0000-0000-0000-00000000000b', 'c7100000-0000-0000-0000-00000000000b', 'Draft', 'draft')
) AS v(provider, address, title, status);

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

-- ----------------------------------------------------------------- customer
DO $$ BEGIN PERFORM pg_temp.login('c7000000-0000-0000-0000-0000000000f1'); END $$;
SET LOCAL ROLE authenticated;

SELECT pg_temp.check('a customer reads the contact details of a provider with a published activity',
    (SELECT name || '/' || email || '/' || phone_number || '/' || website
     FROM public.public_provider_contacts()
     WHERE provider_id = 'c7000000-0000-0000-0000-00000000000a'),
    'Club A/a@test.com/600000000/https://club-a.test');
SELECT pg_temp.check('only the newest technical sheet of a provider is returned',
    (SELECT count(*)::text FROM public.public_provider_contacts()
     WHERE provider_id = 'c7000000-0000-0000-0000-00000000000a'),
    '1');
SELECT pg_temp.check('a provider without published activities is not returned',
    (SELECT count(*)::text FROM public.public_provider_contacts()
     WHERE provider_id = 'c7000000-0000-0000-0000-00000000000b'),
    '0');
SELECT pg_temp.check('only the public contact columns are returned, never the rest of the sheet',
    (SELECT array_to_string(proargnames, ',') FROM pg_proc WHERE proname = 'public_provider_contacts'),
    'provider_id,name,email,phone_number,website');
SELECT pg_temp.check('a customer cannot read the technical sheets directly',
    (SELECT count(*)::text FROM public.technical_sheets), '0');
SELECT pg_temp.expect('a customer cannot change a technical sheet',
    $q$UPDATE public.technical_sheets SET name = 'Hacked'
       WHERE provider_id = 'c7000000-0000-0000-0000-00000000000a'$q$);

RESET ROLE;
SELECT pg_temp.check('the update of the customer changed nothing',
    (SELECT count(*)::text FROM public.technical_sheets WHERE name = 'Hacked'), '0');

-- ----------------------------------------------------------------- providers
DO $$ BEGIN PERFORM pg_temp.login('c7000000-0000-0000-0000-00000000000b'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.check('another provider reads the public contact details too',
    (SELECT name FROM public.public_provider_contacts()
     WHERE provider_id = 'c7000000-0000-0000-0000-00000000000a'),
    'Club A');
SELECT pg_temp.check('another provider cannot read the technical sheet',
    (SELECT count(*)::text FROM public.technical_sheets
     WHERE provider_id = 'c7000000-0000-0000-0000-00000000000a'),
    '0');
SELECT pg_temp.check('a provider still reads its own technical sheet',
    (SELECT name FROM public.technical_sheets
     WHERE provider_id = 'c7000000-0000-0000-0000-00000000000b'),
    'Club B');

-- ----------------------------------------------------------------- anonymous
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.expect('an anonymous user cannot read the contact details',
    $q$SELECT * FROM public.public_provider_contacts()$q$,
    'permission denied for function public_provider_contacts');

ROLLBACK;
