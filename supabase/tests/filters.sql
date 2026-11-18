-- #102: filters of the activity search and the values available to build them.
-- Run on the local database; everything is rolled back:
--   docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/filters.sql
-- Every line of the result must start with "ok".

\set QUIET on
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

BEGIN;

-- The test only sees its own rows: other published activities (e.g. from the
-- seed) would change the counts and the available values.
ALTER TABLE public.activities DISABLE TRIGGER USER;
UPDATE public.activities SET status = 'draft' WHERE status = 'published';
ALTER TABLE public.activities ENABLE TRIGGER USER;

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
    ('f1000000-0000-0000-0000-00000000000a', 'filters-club@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('f1000000-0000-0000-0000-0000000000f1', 'filters-family@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated');

INSERT INTO public.addresses (id, provider_id, street, number, postal_code, city, province, country) VALUES
    ('f1100000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-00000000000a', 'C/ Major', '1', '25001', 'Lleida', 'Lleida', 'Spain'),
    ('f1100000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-00000000000a', 'C/ Major', '2', '25002', 'LLEIDA', 'Lleida', 'Spain'),
    ('f1100000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-00000000000a', 'C/ Major', '3', '25300', 'Tàrrega', 'Lleida', 'Spain');

INSERT INTO public.technical_sheets (provider_id, name, provider_type, activity_types, address_id, email) VALUES
    ('f1000000-0000-0000-0000-00000000000a', 'Club Filtres', 'sports_club', '{music}', 'f1100000-0000-0000-0000-000000000001', 'club@test.com');

-- Only providers with an approved profile show their activities (#103)
INSERT INTO public.provider_profiles (provider_id, headline, description, model, status, approved_at, approved_headline, approved_description)
VALUES ('f1000000-0000-0000-0000-00000000000a', 'Club Filtres', 'Sports club', 'test', 'approved', now(), 'Club Filtres', 'Sports club');

-- Inserted as drafts: publishing needs the full publication rules, which this
-- test does not check. The statuses are set afterwards.
--   Piano          music     7-9          Lleida  25001  30 per_month
--   Swimming kids  swimming  4-6, 7-9     LLEIDA  25002  50 per_month
--   Swimming adult swimming  adult        Tàrrega 25300  20 per_hour
--   Open football  football  all_publics  Lleida  25001  10 per_hour
--   Teen music     music     13-15        Tàrrega 25300  80 per_month
--   Draft music    music     7-9          Lleida  25001  30 per_month (draft)
INSERT INTO public.activities (
    id, provider_id, address_id, title, description, category, target_age_ranges,
    schedule, price, price_period, max_participants, status, created_at
) VALUES
    ('f1200000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-00000000000a', 'f1100000-0000-0000-0000-000000000001',
     'Piano', 'Music lessons', 'music', '{7-9}',
     '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 30, 'per_month', 10, 'draft', now() - interval '5 days'),
    ('f1200000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-00000000000a', 'f1100000-0000-0000-0000-000000000002',
     'Swimming kids', NULL, 'swimming', '{4-6,7-9}',
     '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 50, 'per_month', 10, 'draft', now() - interval '4 days'),
    ('f1200000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-00000000000a', 'f1100000-0000-0000-0000-000000000003',
     'Swimming adult', NULL, 'swimming', '{adult}',
     '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 20, 'per_hour', 10, 'draft', now() - interval '3 days'),
    ('f1200000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-00000000000a', 'f1100000-0000-0000-0000-000000000001',
     'Open football', NULL, 'football', '{all_publics}',
     '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 10, 'per_hour', 10, 'draft', now() - interval '2 days'),
    ('f1200000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-00000000000a', 'f1100000-0000-0000-0000-000000000003',
     'Teen music', NULL, 'music', '{13-15}',
     '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 80, 'per_month', 10, 'draft', now() - interval '1 day'),
    ('f1200000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-00000000000a', 'f1100000-0000-0000-0000-000000000001',
     'Draft music', NULL, 'music', '{7-9}',
     '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 30, 'per_month', 10, 'draft', now());
ALTER TABLE public.activities DISABLE TRIGGER USER;
UPDATE public.activities SET status = 'published'
WHERE id IN ('f1200000-0000-0000-0000-000000000001', 'f1200000-0000-0000-0000-000000000002',
             'f1200000-0000-0000-0000-000000000003', 'f1200000-0000-0000-0000-000000000004',
             'f1200000-0000-0000-0000-000000000005');
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

-- Titles found by a search (a SELECT of search_activities with named
-- arguments), sorted by name so the checks do not depend on the order
CREATE FUNCTION pg_temp.titles(p_call text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE result text;
BEGIN
    EXECUTE format('SELECT coalesce(string_agg(title, '' | '' ORDER BY title), '''') FROM %s', p_call)
    INTO result;
    RETURN result;
END;
$$;

SELECT set_config('request.jwt.claims',
    json_build_object('sub', 'f1000000-0000-0000-0000-0000000000f1', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

-- No filters
SELECT pg_temp.check('without filters every published activity is returned',
    pg_temp.titles('public.search_activities()'),
    'Open football | Piano | Swimming adult | Swimming kids | Teen music');

-- Category
SELECT pg_temp.check('one category',
    pg_temp.titles($$public.search_activities(p_categories => '{swimming}')$$),
    'Swimming adult | Swimming kids');
SELECT pg_temp.check('several categories',
    pg_temp.titles($$public.search_activities(p_categories => '{swimming,football}')$$),
    'Open football | Swimming adult | Swimming kids');
SELECT pg_temp.check('an empty list of categories is no filter',
    pg_temp.titles($$public.search_activities(p_categories => '{}')$$),
    pg_temp.titles('public.search_activities()'));
SELECT pg_temp.expect('an unknown category is rejected',
    $q$SELECT * FROM public.search_activities(p_categories => '{music,cooking}')$q$, 'search_unknown_category');
SELECT pg_temp.expect('a NULL category in the list is rejected',
    $q$SELECT * FROM public.search_activities(p_categories => ARRAY['music', NULL])$q$, 'search_unknown_category');

-- Age range: overlap; all_publics always matches
SELECT pg_temp.check('an age inside a range',
    pg_temp.titles('public.search_activities(p_age_min => 8, p_age_max => 8)'),
    'Open football | Piano | Swimming kids');
SELECT pg_temp.check('a requested range that overlaps the end of a range',
    pg_temp.titles('public.search_activities(p_age_min => 2, p_age_max => 4)'),
    'Open football | Swimming kids');
SELECT pg_temp.check('only a minimum age: that age and older',
    pg_temp.titles('public.search_activities(p_age_min => 14)'),
    'Open football | Swimming adult | Teen music');
SELECT pg_temp.check('only a maximum age: that age and younger',
    pg_temp.titles('public.search_activities(p_age_max => 5)'),
    'Open football | Swimming kids');
SELECT pg_temp.check('18 is an adult',
    pg_temp.titles('public.search_activities(p_age_min => 18, p_age_max => 18)'),
    'Open football | Swimming adult');
SELECT pg_temp.check('17 is not an adult',
    pg_temp.titles('public.search_activities(p_age_min => 17, p_age_max => 17)'),
    'Open football');
SELECT pg_temp.expect('a negative age is rejected',
    'SELECT * FROM public.search_activities(p_age_min => -1)', 'search_negative_age');
SELECT pg_temp.expect('a minimum age higher than the maximum is rejected',
    'SELECT * FROM public.search_activities(p_age_min => 10, p_age_max => 9)', 'search_invalid_age_range');
SELECT pg_temp.expect('the same minimum and maximum age are accepted',
    'SELECT * FROM public.search_activities(p_age_min => 9, p_age_max => 9)');

-- City and postal code
SELECT pg_temp.check('the city ignores case and spaces around',
    pg_temp.titles($$public.search_activities(p_city => '  lleida ')$$),
    'Open football | Piano | Swimming kids');
SELECT pg_temp.check('the city is compared whole, not as a part of the text',
    pg_temp.titles($$public.search_activities(p_city => 'Lle')$$), '');
SELECT pg_temp.check('a blank city is no filter',
    pg_temp.titles($$public.search_activities(p_city => '  ')$$),
    pg_temp.titles('public.search_activities()'));
SELECT pg_temp.check('the postal code',
    pg_temp.titles($$public.search_activities(p_postal_code => '25001')$$),
    'Open football | Piano');
SELECT pg_temp.check('city and postal code together',
    pg_temp.titles($$public.search_activities(p_city => 'Lleida', p_postal_code => '25002')$$),
    'Swimming kids');

-- Price: only within the same period
SELECT pg_temp.check('the period alone',
    pg_temp.titles($$public.search_activities(p_price_period => 'per_hour')$$),
    'Open football | Swimming adult');
SELECT pg_temp.check('a price range only finds activities of that period',
    pg_temp.titles($$public.search_activities(p_price_min => 20, p_price_max => 50, p_price_period => 'per_month')$$),
    'Piano | Swimming kids');
SELECT pg_temp.check('the limits of the range are included',
    pg_temp.titles($$public.search_activities(p_price_min => 30, p_price_max => 30, p_price_period => 'per_month')$$),
    'Piano');
SELECT pg_temp.check('only a maximum price',
    pg_temp.titles($$public.search_activities(p_price_max => 15, p_price_period => 'per_hour')$$),
    'Open football');
SELECT pg_temp.expect('a price without a period is rejected',
    'SELECT * FROM public.search_activities(p_price_max => 50)', 'search_price_period_required');
SELECT pg_temp.expect('an unknown period is rejected',
    $q$SELECT * FROM public.search_activities(p_price_period => 'per_session')$q$, 'search_unknown_price_period');
SELECT pg_temp.expect('a negative price is rejected',
    $q$SELECT * FROM public.search_activities(p_price_min => -1, p_price_period => 'per_month')$q$, 'search_negative_price');
SELECT pg_temp.expect('a minimum price higher than the maximum is rejected',
    $q$SELECT * FROM public.search_activities(p_price_min => 50, p_price_max => 49.99, p_price_period => 'per_month')$q$,
    'search_invalid_price_range');

-- Combined filters (AND), with and without text
SELECT pg_temp.check('category and age',
    pg_temp.titles($$public.search_activities(p_categories => '{music}', p_age_min => 13, p_age_max => 15)$$),
    'Teen music');
SELECT pg_temp.check('category, city and price',
    pg_temp.titles($$public.search_activities(p_categories => '{music,swimming}', p_city => 'lleida',
        p_price_max => 40, p_price_period => 'per_month')$$),
    'Piano');
SELECT pg_temp.check('every filter together',
    pg_temp.titles($$public.search_activities(p_categories => '{swimming}', p_age_min => 5, p_age_max => 5,
        p_city => 'Lleida', p_postal_code => '25002', p_price_min => 50, p_price_max => 50, p_price_period => 'per_month')$$),
    'Swimming kids');
SELECT pg_temp.check('filters that exclude each other return nothing',
    pg_temp.titles($$public.search_activities(p_categories => '{football}', p_city => 'Tàrrega')$$), '');
SELECT pg_temp.check('text and a filter',
    pg_temp.titles($$public.search_activities(p_query => 'swimming', p_city => 'Tàrrega')$$),
    'Swimming adult');
SELECT pg_temp.check('text and several filters',
    pg_temp.titles($$public.search_activities(p_query => 'music', p_age_min => 8, p_price_period => 'per_month')$$),
    'Piano | Teen music');
SELECT pg_temp.check('a draft is never returned, whatever the filters',
    pg_temp.titles($$public.search_activities(p_query => 'draft', p_categories => '{music}')$$), '');
SELECT pg_temp.check('pagination still applies with filters',
    (SELECT count(*)::text FROM public.search_activities(p_categories => '{swimming,music}', p_limit => 3)), '3');
SELECT pg_temp.expect('the text is still validated with filters',
    $q$SELECT * FROM public.search_activities(p_query => 'a', p_city => 'Lleida')$q$, 'search_query_too_short');

-- Available values
SELECT pg_temp.check('the categories are the catalogue',
    (SELECT (public.available_activity_filters() -> 'categories')::text),
    (SELECT jsonb_agg(name ORDER BY name)::text FROM public.categories));
SELECT pg_temp.check('the cities of published activities, once each whatever their case',
    (SELECT jsonb_array_length(public.available_activity_filters() -> 'cities')::text
          || ' ' || (public.available_activity_filters() -> 'cities' ->> 1)), '2 Tàrrega');
SELECT pg_temp.check('the price range of each period, drafts excluded',
    (SELECT (public.available_activity_filters() -> 'prices')::text),
    '[{"max": 20.00, "min": 10.00, "period": "per_hour"}, {"max": 80.00, "min": 30.00, "period": "per_month"}]');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.expect('an anonymous user cannot search with filters',
    $q$SELECT * FROM public.search_activities(p_city => 'Lleida')$q$,
    'permission denied for function search_activities');
SELECT pg_temp.expect('an anonymous user cannot read the available values',
    'SELECT public.available_activity_filters()',
    'permission denied for function available_activity_filters');

ROLLBACK;
