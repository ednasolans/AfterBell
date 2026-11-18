-- #101: text search of the published activities and tutor offers.
-- Run on the local database; everything is rolled back:
--   docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/text_search.sql
-- Every line of the result must start with "ok".

\set QUIET on
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
    ('e1000000-0000-0000-0000-00000000000a', 'search-club-a@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('e1000000-0000-0000-0000-00000000000b', 'search-tutor@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('e1000000-0000-0000-0000-00000000000c', 'search-unapproved@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('e1000000-0000-0000-0000-0000000000f1', 'search-family@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated');

INSERT INTO public.addresses (id, provider_id, street, number, postal_code, city, province, country) VALUES
    ('e1100000-0000-0000-0000-00000000000a', 'e1000000-0000-0000-0000-00000000000a', 'C/ Major', '1', '25001', 'Lleida', 'Lleida', 'Spain'),
    ('e1100000-0000-0000-0000-00000000000b', 'e1000000-0000-0000-0000-00000000000b', 'C/ Major', '2', '25001', 'Lleida', 'Lleida', 'Spain'),
    ('e1100000-0000-0000-0000-00000000000c', 'e1000000-0000-0000-0000-00000000000c', 'C/ Major', '3', '25001', 'Lleida', 'Lleida', 'Spain');

-- Customers only see activities of providers with an approved profile (#103):
-- providers a and b have one, provider c does not
INSERT INTO public.provider_profiles (provider_id, headline, description, model, status, approved_at, approved_headline, approved_description) VALUES
    ('e1000000-0000-0000-0000-00000000000a', 'Escola Pirineus', 'Music school', 'test', 'approved', now(), 'Escola Pirineus', 'Music school'),
    ('e1000000-0000-0000-0000-00000000000b', 'Anna Tutor', 'Private tutor', 'test', 'approved', now(), 'Anna Tutor', 'Private tutor');

INSERT INTO public.technical_sheets (provider_id, name, provider_type, activity_types, address_id, email) VALUES
    ('e1000000-0000-0000-0000-00000000000a', 'Escola Pirineus', 'sports_club', '{music}', 'e1100000-0000-0000-0000-00000000000a', 'a@test.com'),
    ('e1000000-0000-0000-0000-00000000000b', 'Anna Tutor', 'private_tutor', '{tutoring}', 'e1100000-0000-0000-0000-00000000000b', 'b@test.com'),
    ('e1000000-0000-0000-0000-00000000000c', 'Club Sense Perfil', 'sports_club', '{music}', 'e1100000-0000-0000-0000-00000000000c', 'c@test.com');

-- Inserted as drafts: publishing needs the full publication rules, which this
-- test does not check. The statuses are set afterwards.
INSERT INTO public.activities (
    id, provider_id, address_id, title, description, category, target_age_ranges,
    schedule, price, price_period, max_participants, status, created_at
) VALUES
    ('e1200000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-00000000000a', 'e1100000-0000-0000-0000-00000000000a',
     'Música per a nens', 'Learn to play together', 'music', '{7-9}',
     '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 20, 'per_month', 10, 'draft', now() - interval '3 days'),
    ('e1200000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-00000000000a', 'e1100000-0000-0000-0000-00000000000a',
     'Swimming', 'After the musica class', 'swimming', '{7-9}',
     '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 20, 'per_month', 10, 'draft', now() - interval '2 days'),
    ('e1200000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-00000000000a', 'e1100000-0000-0000-0000-00000000000a',
     'Musica avançada', NULL, 'music', '{10-12}',
     '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 20, 'per_month', 10, 'draft', now() - interval '1 day'),
    ('e1200000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-00000000000a', 'e1100000-0000-0000-0000-00000000000a',
     'Musica draft', NULL, 'music', '{7-9}',
     '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 20, 'per_month', 10, 'draft', now()),
    ('e1200000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-00000000000a', 'e1100000-0000-0000-0000-00000000000a',
     '100% Fun_Run', NULL, 'other', '{7-9}',
     '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 20, 'per_month', 10, 'draft', now()),
    ('e1200000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-00000000000b', 'e1100000-0000-0000-0000-00000000000b',
     'Maths help', 'Private lessons', 'tutoring', '{10-12}',
     '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 20, 'per_hour', 1, 'draft', now()),
    ('e1200000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-00000000000c', 'e1100000-0000-0000-0000-00000000000c',
     'Musica sense perfil', NULL, 'music', '{7-9}',
     '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 20, 'per_month', 10, 'draft', now());
ALTER TABLE public.activities DISABLE TRIGGER USER;
UPDATE public.activities SET is_tutor = true WHERE id = 'e1200000-0000-0000-0000-000000000006';
UPDATE public.activities SET status = 'published' WHERE id <> 'e1200000-0000-0000-0000-000000000004';
ALTER TABLE public.activities ENABLE TRIGGER USER;

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

CREATE FUNCTION pg_temp.check(p_name text, p_actual text, p_expected text)
RETURNS text LANGUAGE sql AS $$
    SELECT CASE WHEN p_actual IS NOT DISTINCT FROM p_expected THEN 'ok   ' || p_name
                ELSE 'FAIL ' || p_name || ': got ' || coalesce(p_actual, 'NULL') END;
$$;

-- Titles of a search, in the order returned
CREATE FUNCTION pg_temp.titles(p_query text, p_limit int DEFAULT 20, p_offset int DEFAULT 0)
RETURNS text LANGUAGE sql AS $$
    SELECT coalesce(string_agg(title, ' | '), '') FROM (
        SELECT title FROM public.search_activities(p_query, NULL, NULL, NULL, NULL, p_limit, p_offset)
    ) s;
$$;

SELECT set_config('request.jwt.claims',
    json_build_object('sub', 'e1000000-0000-0000-0000-0000000000f1', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

SELECT pg_temp.check('"musica" finds title and description; title matches rank first, ties newest first',
    pg_temp.titles('musica'),
    'Musica avançada | Música per a nens | Swimming');
SELECT pg_temp.check('the search ignores case and accents in the text typed',
    pg_temp.titles('MÚSICA'), pg_temp.titles('musica'));
SELECT pg_temp.check('the text is trimmed',
    pg_temp.titles('   musica   '), pg_temp.titles('musica'));
SELECT pg_temp.check('every word must match, in any order',
    pg_temp.titles('nens musica'), 'Música per a nens');
SELECT pg_temp.check('the provider name is searched',
    pg_temp.titles('pirineus'),
    '100% Fun_Run | Musica avançada | Swimming | Música per a nens');
SELECT pg_temp.check('a draft is never returned',
    (SELECT count(*)::text FROM public.search_activities('draft', NULL, NULL, NULL, NULL, 20, 0)), '0');
SELECT pg_temp.check('a published tutor offer is returned',
    pg_temp.titles('maths'), 'Maths help');
SELECT pg_temp.check('the tutor is found by the name of the provider',
    pg_temp.titles('anna'), 'Maths help');
SELECT pg_temp.check('% is plain text, not a wildcard',
    pg_temp.titles('%%'), '');
SELECT pg_temp.check('100% finds only the title that has it',
    pg_temp.titles('100%'), '100% Fun_Run');
SELECT pg_temp.check('_ is plain text, not a wildcard',
    pg_temp.titles('fun_r'), '100% Fun_Run');
SELECT pg_temp.check('a quote does not break the query',
    pg_temp.titles($$'; DROP TABLE public.activities; --$$), '');
SELECT pg_temp.check('a blank text returns every published activity',
    (SELECT count(*)::text FROM public.search_activities('   ', NULL, NULL, NULL, NULL, 20, 0)), '5');
SELECT pg_temp.check('the first page has the limit',
    pg_temp.titles('musica', 1, 0), 'Musica avançada');
SELECT pg_temp.check('the second page continues the order',
    pg_temp.titles('musica', 1, 1), 'Música per a nens');
SELECT pg_temp.check('an activity of a provider without an approved profile is never returned',
    (SELECT count(*)::text FROM public.search_activities('sense perfil', NULL, NULL, NULL, NULL, 20, 0)), '0');

-- Total of a search (#103)
SELECT pg_temp.check('the count is the number of results across every page',
    (SELECT public.count_search_activities('musica')::text), '3');
SELECT pg_temp.check('the count does not depend on the page size',
    (SELECT public.count_search_activities('musica')::text),
    (SELECT count(*)::text FROM public.search_activities('musica', NULL, NULL, NULL, NULL, 100, 0)));
SELECT pg_temp.check('a blank text counts every published activity of approved providers',
    (SELECT public.count_search_activities('   ')::text), '5');
SELECT pg_temp.check('the count of a search without results is 0',
    (SELECT public.count_search_activities('futbol')::text), '0');
SELECT pg_temp.check('the count applies the filters',
    (SELECT public.count_search_activities('musica', p_categories => '{music}')::text), '2');
SELECT pg_temp.expect('the count validates the text like the search',
    $q$SELECT public.count_search_activities('a')$q$, 'search_query_too_short');

SELECT pg_temp.expect('one character is rejected',
    $q$SELECT * FROM public.search_activities('a')$q$, 'search_query_too_short');
SELECT pg_temp.expect('a text of one character with spaces is rejected',
    $q$SELECT * FROM public.search_activities('  a  ')$q$, 'search_query_too_short');
SELECT pg_temp.expect('two characters are accepted',
    $q$SELECT * FROM public.search_activities('mu')$q$);
SELECT pg_temp.expect('100 characters are accepted',
    format($q$SELECT * FROM public.search_activities(%L)$q$, repeat('a', 100)));
SELECT pg_temp.expect('101 characters are rejected',
    format($q$SELECT * FROM public.search_activities(%L)$q$, repeat('a', 101)), 'search_query_too_long');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.expect('an anonymous user cannot search',
    $q$SELECT * FROM public.search_activities('musica')$q$,
    'permission denied for function search_activities');
SELECT pg_temp.expect('an anonymous user cannot count a search',
    $q$SELECT public.count_search_activities('musica')$q$,
    'permission denied for function count_search_activities');

ROLLBACK;
