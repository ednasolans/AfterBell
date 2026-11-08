-- #87: publish and unpublish activities, and the list of missing requirements.
-- Run on the local database; everything is rolled back:
--   docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/activity_publication.sql
-- Every line of the result must start with "ok".

BEGIN;

-- Club A has a complete technical sheet; club B has none.
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
    ('e0000000-0000-0000-0000-00000000000a', 'publish-club-a@test.com',
     '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('e0000000-0000-0000-0000-00000000000b', 'publish-club-b@test.com',
     '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('e0000000-0000-0000-0000-00000000000c', 'publish-family@test.com',
     '{"account_type":"customer"}', 'authenticated', 'authenticated');

INSERT INTO public.addresses (id, provider_id, street, number, postal_code, city, province, country) VALUES
    ('f0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-00000000000a',
     'C/ Major', '1', '25001', 'Lleida', 'Lleida', 'Spain'),
    ('f0000000-0000-0000-0000-00000000000b', 'e0000000-0000-0000-0000-00000000000b',
     'C/ Nova', '2', '25002', 'Lleida', 'Lleida', 'Spain');

-- An address saved before the structured fields existed (incomplete)
ALTER TABLE public.addresses DISABLE TRIGGER require_structured_address_on_insert;
INSERT INTO public.addresses (id, provider_id, address, city)
VALUES ('f0000000-0000-0000-0000-0000000000aa', 'e0000000-0000-0000-0000-00000000000a',
        'Old address 3', 'Lleida');
ALTER TABLE public.addresses ENABLE TRIGGER require_structured_address_on_insert;

INSERT INTO public.technical_sheets (provider_id, name, provider_type, activity_types, address_id, email)
VALUES ('e0000000-0000-0000-0000-00000000000a', 'Club A', 'sports_club', '{football}',
        'f0000000-0000-0000-0000-00000000000a', 'club-a@test.com');

-- Three draft activities: complete (A), language with the old address (A),
-- and one of club B
INSERT INTO public.activities (
    id, provider_id, address_id, title, category, target_age_ranges, schedule,
    price, price_period, max_participants
)
SELECT v.id::uuid, v.provider_id::uuid, v.address_id::uuid, 'Activity', v.category, '{7-9}',
       '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 20, 'per_month', 12
FROM (VALUES
    ('a1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-00000000000a',
     'f0000000-0000-0000-0000-00000000000a', 'football'),
    ('a1000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-00000000000a',
     'f0000000-0000-0000-0000-0000000000aa', 'language'),
    ('a1000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-00000000000b',
     'f0000000-0000-0000-0000-00000000000b', 'music')
) AS v (id, provider_id, address_id, category);

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

-- Prints "ok" if the query returns the expected value
CREATE FUNCTION pg_temp.expect_value(p_name text, p_sql text, p_expected text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
    actual text;
BEGIN
    EXECUTE p_sql INTO actual;
    IF actual IS NOT DISTINCT FROM p_expected THEN RETURN 'ok   ' || p_name; END IF;
    RETURN 'FAIL ' || p_name || ': got ' || coalesce(actual, 'NULL');
EXCEPTION WHEN OTHERS THEN
    RETURN 'FAIL ' || p_name || ': ' || SQLERRM;
END;
$$;

-- Prints "ok" if publishing fails and the DETAIL lists the expected issues
CREATE FUNCTION pg_temp.expect_detail(p_name text, p_sql text, p_detail text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
    detail text;
BEGIN
    EXECUTE p_sql;
    RETURN 'FAIL ' || p_name || ': no error';
EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS detail = PG_EXCEPTION_DETAIL;
    IF detail = p_detail THEN RETURN 'ok   ' || p_name; END IF;
    RETURN 'FAIL ' || p_name || ': ' || coalesce(detail, SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION pg_temp.expect(text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION pg_temp.expect_value(text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION pg_temp.expect_detail(text, text, text) TO authenticated;

\pset tuples_only on
\pset format unaligned

-- ============================================================
-- Club A: the list of missing requirements
-- ============================================================

SET LOCAL request.jwt.claims = '{"sub":"e0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT pg_temp.expect_value('a complete activity has nothing missing',
    $q$SELECT public.activity_publication_issues('a1000000-0000-0000-0000-000000000001')::text$q$,
    '{}');

SELECT pg_temp.expect_value('every missing requirement is listed, not only the first',
    $q$SELECT public.activity_publication_issues('a1000000-0000-0000-0000-000000000002')::text$q$,
    '{address,language}');

SELECT pg_temp.expect_detail('the publish error lists every missing requirement',
    $q$UPDATE public.activities SET status = 'published'
       WHERE id = 'a1000000-0000-0000-0000-000000000002'$q$,
    'Missing: address, language');

SELECT pg_temp.expect('the publish error keeps the previous message',
    $q$UPDATE public.activities SET status = 'published'
       WHERE id = 'a1000000-0000-0000-0000-000000000002'$q$,
    'A complete structured address is required to publish');

-- Fix the address and add the language: nothing is missing any more
UPDATE public.activities SET address_id = 'f0000000-0000-0000-0000-00000000000a'
WHERE id = 'a1000000-0000-0000-0000-000000000002';

SELECT pg_temp.expect_value('fixing the address removes it from the list',
    $q$SELECT public.activity_publication_issues('a1000000-0000-0000-0000-000000000002')::text$q$,
    '{language}');

INSERT INTO public.languages (activity_id, language, level)
VALUES ('a1000000-0000-0000-0000-000000000002', 'English', 'B1');

SELECT pg_temp.expect_value('adding the language empties the list',
    $q$SELECT public.activity_publication_issues('a1000000-0000-0000-0000-000000000002')::text$q$,
    '{}');

-- ============================================================
-- Club A: publish and unpublish
-- ============================================================

SELECT pg_temp.expect('the owner publishes a complete activity',
    $q$UPDATE public.activities SET status = 'published'
       WHERE id = 'a1000000-0000-0000-0000-000000000001'$q$);

SELECT pg_temp.expect('the owner unpublishes it',
    $q$UPDATE public.activities SET status = 'draft'
       WHERE id = 'a1000000-0000-0000-0000-000000000001'$q$);

SELECT pg_temp.expect_value('unpublishing keeps the activity and its data',
    $q$SELECT title || ' / ' || status FROM public.activities
       WHERE id = 'a1000000-0000-0000-0000-000000000001'$q$,
    'Activity / draft');

SELECT pg_temp.expect('an unknown status is rejected',
    $q$UPDATE public.activities SET status = 'archived'
       WHERE id = 'a1000000-0000-0000-0000-000000000001'$q$,
    'new row for relation "activities" violates check constraint "activities_status_check"');

UPDATE public.activities SET status = 'published'
WHERE id = 'a1000000-0000-0000-0000-000000000001';

-- Club A cannot see what club B is missing, nor publish its activities
SELECT pg_temp.expect_value('another provider gets no list',
    $q$SELECT public.activity_publication_issues('a1000000-0000-0000-0000-000000000003')::text$q$,
    NULL);

SELECT pg_temp.expect_value('another provider cannot publish the activity',
    $q$WITH changed AS (
           UPDATE public.activities SET status = 'published'
           WHERE id = 'a1000000-0000-0000-0000-000000000003' RETURNING id
       ) SELECT count(*)::text FROM changed$q$,
    '0');

RESET ROLE;

-- ============================================================
-- Club B: no technical sheet
-- ============================================================

SET LOCAL request.jwt.claims = '{"sub":"e0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT pg_temp.expect_value('a provider without technical sheet is told so',
    $q$SELECT public.activity_publication_issues('a1000000-0000-0000-0000-000000000003')::text$q$,
    '{technical_sheet}');

SELECT pg_temp.expect('a provider without technical sheet cannot publish',
    $q$UPDATE public.activities SET status = 'published'
       WHERE id = 'a1000000-0000-0000-0000-000000000003'$q$,
    'A complete technical sheet is required to publish');

RESET ROLE;

-- ============================================================
-- Customer: sees only published activities
-- ============================================================

SET LOCAL request.jwt.claims = '{"sub":"e0000000-0000-0000-0000-00000000000c","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT pg_temp.expect_value('a customer sees the published activity',
    $q$SELECT count(*)::text FROM public.activities
       WHERE id = 'a1000000-0000-0000-0000-000000000001'$q$,
    '1');

SELECT pg_temp.expect_value('a customer does not see draft activities',
    $q$SELECT count(*)::text FROM public.activities
       WHERE id IN ('a1000000-0000-0000-0000-000000000002',
                    'a1000000-0000-0000-0000-000000000003')$q$,
    '0');

SELECT pg_temp.expect_value('a customer gets no list',
    $q$SELECT public.activity_publication_issues('a1000000-0000-0000-0000-000000000001')::text$q$,
    NULL);

RESET ROLE;

-- ============================================================
-- Rules shared by every check
-- ============================================================

SELECT pg_temp.expect_value('can_publish_activity agrees with the list (complete)',
    $q$SELECT public.can_publish_activity('a1000000-0000-0000-0000-000000000002')::text$q$,
    'true');

SELECT pg_temp.expect_value('can_publish_activity agrees with the list (incomplete)',
    $q$SELECT public.can_publish_activity('a1000000-0000-0000-0000-000000000003')::text$q$,
    'false');

SELECT pg_temp.expect_value('can_publish_activity is false for an unknown activity',
    $q$SELECT public.can_publish_activity('a1000000-0000-0000-0000-0000000000ff')::text$q$,
    'false');

SET LOCAL ROLE anon;

SELECT pg_temp.expect('users without a session cannot ask for the list',
    $q$SELECT public.activity_publication_issues('a1000000-0000-0000-0000-000000000001')$q$,
    'permission denied for function activity_publication_issues');

RESET ROLE;

ROLLBACK;