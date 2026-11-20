-- #106: recommendations of a family (age, interests, town, availability, order).
-- Run on the local database; everything is rolled back:
--   docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/recommendations.sql
-- Every line of the result must start with "ok".

\set QUIET on
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

BEGIN;

-- Club A has an approved profile, club B does not.
-- f1: family with 3 profiles in "lleida"; f2: another family; f3: no city;
-- f4: no profiles; f5: a profile without date of birth.
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
    ('a1060000-0000-0000-0000-00000000000a', 'rec-club-a@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('a1060000-0000-0000-0000-00000000000b', 'rec-club-b@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('a1060000-0000-0000-0000-0000000000f1', 'rec-family-1@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated'),
    ('a1060000-0000-0000-0000-0000000000f2', 'rec-family-2@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated'),
    ('a1060000-0000-0000-0000-0000000000f3', 'rec-family-3@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated'),
    ('a1060000-0000-0000-0000-0000000000f4', 'rec-family-4@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated'),
    ('a1060000-0000-0000-0000-0000000000f5', 'rec-family-5@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated');

-- The town and the point of each family (set_family_location needs a session)
UPDATE public.family_groups g
SET city = v.city,
    location = extensions.ST_SetSRID(extensions.ST_MakePoint(0.62, 41.62), 4326)::extensions.geography
FROM (VALUES ('a1060000-0000-0000-0000-0000000000f1', 'lleida'),
             ('a1060000-0000-0000-0000-0000000000f2', 'Lleida'),
             ('a1060000-0000-0000-0000-0000000000f4', 'Lleida'),
             ('a1060000-0000-0000-0000-0000000000f5', 'Lleida')) AS v(account, city)
WHERE g.id = (SELECT family_group_id FROM public.family_group_members WHERE account_id = v.account::uuid);

-- Marc and Laia are 8, Joan turns 17 tomorrow (he is still 16), Pol is 8 (family 2)
INSERT INTO public.family_profiles (id, family_group_id, first_name, date_of_birth, interests)
SELECT v.id::uuid, m.family_group_id, v.name, v.dob, v.interests
FROM (VALUES
    ('a1060000-0000-0000-0000-0000000000c1', 'a1060000-0000-0000-0000-0000000000f1', 'Marc', current_date - interval '8 years', '{football,art}'::text[]),
    ('a1060000-0000-0000-0000-0000000000c2', 'a1060000-0000-0000-0000-0000000000f1', 'Laia', current_date - interval '8 years', '{football}'),
    ('a1060000-0000-0000-0000-0000000000c3', 'a1060000-0000-0000-0000-0000000000f1', 'Joan', current_date - interval '17 years' + interval '1 day', '{music}'),
    ('a1060000-0000-0000-0000-0000000000c4', 'a1060000-0000-0000-0000-0000000000f2', 'Pol', current_date - interval '8 years', '{football}'),
    ('a1060000-0000-0000-0000-0000000000c5', 'a1060000-0000-0000-0000-0000000000f5', 'Ona', NULL, '{football}')
) AS v(id, account, name, dob, interests)
JOIN public.family_group_members m ON m.account_id = v.account::uuid;

INSERT INTO public.provider_profiles (provider_id, headline, description, model, status, approved_at, approved_headline, approved_description)
VALUES ('a1060000-0000-0000-0000-00000000000a', 'Club A', 'Club', 'test', 'approved', now(), 'Club A', 'Club');

-- near and far are in Lleida (far is about 10 km from the family), Barcelona is another town,
-- "nopoint" has no point
INSERT INTO public.addresses (id, provider_id, street, number, postal_code, city, province, country, location) VALUES
    ('a1060000-0000-0000-0000-0000000000d1', 'a1060000-0000-0000-0000-00000000000a', 'C/ Near', '1', '25001', 'Lleida', 'Lleida', 'Spain',
        extensions.ST_SetSRID(extensions.ST_MakePoint(0.62, 41.62), 4326)::extensions.geography),
    ('a1060000-0000-0000-0000-0000000000d2', 'a1060000-0000-0000-0000-00000000000a', 'C/ Far', '2', '25002', 'Lleida', 'Lleida', 'Spain',
        extensions.ST_SetSRID(extensions.ST_MakePoint(0.74, 41.62), 4326)::extensions.geography),
    ('a1060000-0000-0000-0000-0000000000d3', 'a1060000-0000-0000-0000-00000000000a', 'C/ No point', '3', '25003', 'Lleida', 'Lleida', 'Spain', NULL),
    ('a1060000-0000-0000-0000-0000000000d4', 'a1060000-0000-0000-0000-00000000000a', 'C/ Mar', '4', '08001', 'Barcelona', 'Barcelona', 'Spain', NULL),
    ('a1060000-0000-0000-0000-0000000000d5', 'a1060000-0000-0000-0000-00000000000b', 'C/ Club B', '5', '25001', 'Lleida', 'Lleida', 'Spain', NULL);

INSERT INTO public.technical_sheets (provider_id, name, provider_type, activity_types, address_id, email) VALUES
    ('a1060000-0000-0000-0000-00000000000a', 'Club A', 'sports_club', '{football}', 'a1060000-0000-0000-0000-0000000000d1', 'a@test.com'),
    ('a1060000-0000-0000-0000-00000000000b', 'Club B', 'sports_club', '{football}', 'a1060000-0000-0000-0000-0000000000d5', 'b@test.com');

ALTER TABLE public.activities DISABLE TRIGGER activities_validate_dates;
INSERT INTO public.activities (
    id, provider_id, address_id, title, category, type, start_date, end_date,
    target_age_ranges, schedule, price, price_period, max_participants, status, created_at
)
SELECT ('a1060000-0000-0000-0000-0000000001' || lpad(v.n::text, 2, '0'))::uuid,
       ('a1060000-0000-0000-0000-00000000000' || v.provider)::uuid,
       ('a1060000-0000-0000-0000-0000000000' || v.address)::uuid,
       v.title, v.category, v.type, v.start_date, v.end_date, v.ages::text[],
       '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]'::jsonb,
       10, 'per_month', 10, v.status, now() - v.age
FROM (VALUES
    -- 2 profiles fit: Marc and Laia
    (1, 'Football near', 'football', 'whole_year', NULL::date, NULL::date, '{7-9}', 'd1', 'a', 'published', interval '3 days'),
    (2, 'Football ends today', 'football', 'temporary', current_date - 5, current_date, '{7-9}', 'd1', 'a', 'published', interval '1 day'),
    (3, 'Football for all', 'football', 'whole_year', NULL, NULL, '{all_publics}', 'd3', 'a', 'published', interval '10 days'),
    -- 1 profile fits
    (4, 'Art near', 'art', 'whole_year', NULL, NULL, '{7-9}', 'd1', 'a', 'published', interval '2 days'),
    (5, 'Music teens near', 'music', 'whole_year', NULL, NULL, '{16-17}', 'd1', 'a', 'published', interval '4 days'),
    (6, 'Art far', 'art', 'whole_year', NULL, NULL, '{7-9,10-12}', 'd2', 'a', 'published', interval '1 day'),
    -- not recommended
    (7, 'Football 10-12', 'football', 'whole_year', NULL, NULL, '{10-12}', 'd1', 'a', 'published', interval '1 day'),
    (8, 'Swimming 7-9', 'swimming', 'whole_year', NULL, NULL, '{7-9}', 'd1', 'a', 'published', interval '1 day'),
    (9, 'Football Barcelona', 'football', 'whole_year', NULL, NULL, '{7-9}', 'd4', 'a', 'published', interval '1 day'),
    (10, 'Football draft', 'football', 'whole_year', NULL, NULL, '{7-9}', 'd1', 'a', 'draft', interval '1 day'),
    (11, 'Football finished', 'football', 'temporary', current_date - 10, current_date - 1, '{7-9}', 'd1', 'a', 'published', interval '1 day'),
    (12, 'Football club B', 'football', 'whole_year', NULL, NULL, '{7-9}', 'd5', 'b', 'published', interval '1 day'),
    (13, 'Music adults', 'music', 'whole_year', NULL, NULL, '{adult}', 'd1', 'a', 'published', interval '1 day')
) AS v(n, title, category, type, start_date, end_date, ages, address, provider, status, age);
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

-- Titles of the recommendations, in order, with the names of the profiles that fit
CREATE FUNCTION pg_temp.recommended(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS text LANGUAGE sql AS $$
    SELECT string_agg(a.title || '[' || (
        SELECT string_agg(x->>'first_name', ',' ORDER BY ord) FROM jsonb_array_elements(r.matched_profiles) WITH ORDINALITY AS e(x, ord)
    ) || ']', '; ' ORDER BY r.ord)
    FROM public.recommend_activities(p_limit, p_offset) WITH ORDINALITY AS r(activity_id, matched_profiles, matched_count, distance_meters, ord)
    JOIN public.activities a ON a.id = r.activity_id;
$$;

-- ------------------------------------------------------------------ age
SELECT pg_temp.check('age_bracket at the limits',
    (SELECT string_agg(public.age_bracket(y), ' ' ORDER BY y)
     FROM unnest(ARRAY[0, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 17, 18, 90]) AS y),
    '0-3 0-3 4-6 4-6 7-9 7-9 10-12 10-12 13-15 13-15 16-17 16-17 adult adult');
SELECT pg_temp.check('a negative age has no range', public.age_bracket(-1), NULL);

-- ------------------------------------------------------------ family 1
DO $$ BEGIN PERFORM pg_temp.login('a1060000-0000-0000-0000-0000000000f1'); END $$;
SET LOCAL ROLE authenticated;

-- Order: more profiles first (11 before 1 on a tie of distance: newer first;
-- 3 has no point, so it goes last of the two-profile group), then closest,
-- then newest. Joan (still 16) fits the teens music; nothing fits adults.
-- Excluded: other age, other interest, other town, draft, finished,
-- provider without approved profile.
SELECT pg_temp.check('the recommendations and their order',
    pg_temp.recommended(),
    'Football ends today[Laia,Marc]; Football near[Laia,Marc]; Football for all[Laia,Marc]; '
    || 'Art near[Marc]; Music teens near[Joan]; Art far[Marc]');
SELECT pg_temp.check('there are no duplicates',
    (SELECT count(DISTINCT r.activity_id) || '/' || count(*) FROM public.recommend_activities() r), '6/6');
SELECT pg_temp.check('the count is the number of profiles',
    (SELECT string_agg(r.matched_count::text, '' ORDER BY r.ord)
     FROM public.recommend_activities() WITH ORDINALITY AS r(activity_id, matched_profiles, matched_count, distance_meters, ord)),
    '222111');
SELECT pg_temp.check('the distance is in meters and missing without a point',
    (SELECT round(min(distance_meters))::text || '/' || (count(*) FILTER (WHERE distance_meters IS NULL))::text
     FROM public.recommend_activities()), '0/1');
SELECT pg_temp.check('a page of two',
    (SELECT count(*)::text FROM public.recommend_activities(2, 0)), '2');
SELECT pg_temp.check('the second page continues the order',
    pg_temp.recommended(2, 2), 'Football for all[Laia,Marc]; Art near[Marc]');
SELECT pg_temp.check('the limit has a maximum',
    (SELECT count(*)::text FROM public.recommend_activities(1000, 0)), '6');
SELECT pg_temp.check('an offset beyond the end gives nothing',
    (SELECT count(*)::text FROM public.recommend_activities(20, 100)), '0');

-- The age is calculated at the moment of the request: Joan turns 18 today
RESET ROLE;
UPDATE public.family_profiles SET date_of_birth = current_date - interval '18 years'
WHERE id = 'a1060000-0000-0000-0000-0000000000c3';
SET LOCAL ROLE authenticated;
SELECT pg_temp.check('after the birthday the adult range fits and the teen one does not',
    pg_temp.recommended(),
    'Football ends today[Laia,Marc]; Football near[Laia,Marc]; Football for all[Laia,Marc]; '
    || 'Music adults[Joan]; Art near[Marc]; Art far[Marc]');
RESET ROLE;

-- ------------------------------------------------------------ family 2
DO $$ BEGIN PERFORM pg_temp.login('a1060000-0000-0000-0000-0000000000f2'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.check('another family only gets its own profiles (and the town without case)',
    pg_temp.recommended(),
    'Football ends today[Pol]; Football near[Pol]; Football for all[Pol]');
RESET ROLE;

-- ------------------------------------------------ missing data and access
DO $$ BEGIN PERFORM pg_temp.login('a1060000-0000-0000-0000-0000000000f3'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect('a family without a town', $q$SELECT * FROM public.recommend_activities()$q$,
    'recommendations_no_city');
RESET ROLE;

DO $$ BEGIN PERFORM pg_temp.login('a1060000-0000-0000-0000-0000000000f4'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect('a family without profiles', $q$SELECT * FROM public.recommend_activities()$q$,
    'recommendations_no_profiles');
RESET ROLE;

DO $$ BEGIN PERFORM pg_temp.login('a1060000-0000-0000-0000-0000000000f5'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect('a profile without date of birth fits nothing', $q$SELECT * FROM public.recommend_activities()$q$,
    'recommendations_incomplete_profiles');
RESET ROLE;

DO $$ BEGIN PERFORM pg_temp.login('a1060000-0000-0000-0000-00000000000a'); END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect('a provider has no recommendations', $q$SELECT * FROM public.recommend_activities()$q$,
    'recommendations_not_a_customer');
RESET ROLE;

SET LOCAL ROLE anon;
SELECT pg_temp.expect('anonymous users cannot call it', $q$SELECT * FROM public.recommend_activities()$q$,
    'permission denied for function recommend_activities');
RESET ROLE;

ROLLBACK;
