-- #76: dates of temporary activities and publication check on unchanged fields.
-- Run on the local database; everything is rolled back:
--   docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/activity_dates.sql
-- Every line of the result must start with "ok".

BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'dates-club@test.com',
     '{"account_type":"company"}', 'authenticated', 'authenticated');

INSERT INTO public.addresses (id, provider_id, street, number, postal_code, city, province, country)
VALUES ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
        'C/ Major', '1', '25001', 'Lleida', 'Lleida', 'Spain');

INSERT INTO public.technical_sheets (provider_id, name, provider_type, activity_types, address_id, email)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Club', 'sports_club', '{football}',
        'b0000000-0000-0000-0000-000000000001', 'club@test.com');

-- Inserts one activity with the given values
CREATE FUNCTION pg_temp.new_activity(p_type text, p_start date, p_end date, p_status text DEFAULT 'draft')
RETURNS uuid LANGUAGE sql AS $$
    INSERT INTO public.activities (
        provider_id, address_id, title, category, type, target_age_ranges, schedule,
        price, price_period, max_participants, start_date, end_date, status
    ) VALUES (
        'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
        'Camp', 'football', p_type, '{7-9}',
        '[{"day":"monday","startTime":"10:00","endTime":"12:00"}]',
        10, 'per_week', 10, p_start, p_end, p_status
    ) RETURNING id;
$$;

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

\pset tuples_only on
\pset format unaligned

SELECT pg_temp.expect('a whole-year activity without dates is created',
    $q$SELECT pg_temp.new_activity('whole_year', NULL, NULL)$q$);
SELECT pg_temp.expect('a new activity is whole-year by default',
    $q$DO $b$ BEGIN
        IF (SELECT column_default FROM information_schema.columns
            WHERE table_name = 'activities' AND column_name = 'type') <> '''whole_year''::text'
        THEN RAISE EXCEPTION 'wrong default'; END IF;
    END $b$$q$);
SELECT pg_temp.expect('a temporary activity with valid dates is created',
    $q$SELECT pg_temp.new_activity('temporary', current_date + 1, current_date + 8)$q$);
SELECT pg_temp.expect('a temporary activity can start today',
    $q$SELECT pg_temp.new_activity('temporary', current_date, current_date)$q$);
SELECT pg_temp.expect('dates are rejected on a whole-year activity',
    $q$SELECT pg_temp.new_activity('whole_year', current_date + 1, current_date + 8)$q$,
    'Whole-year activities cannot have dates');
SELECT pg_temp.expect('a temporary activity needs a start date',
    $q$SELECT pg_temp.new_activity('temporary', NULL, current_date + 8)$q$,
    'Temporary activities require a start date and an end date');
SELECT pg_temp.expect('a temporary activity needs an end date',
    $q$SELECT pg_temp.new_activity('temporary', current_date + 1, NULL)$q$,
    'Temporary activities require a start date and an end date');
SELECT pg_temp.expect('the end date cannot be before the start date',
    $q$SELECT pg_temp.new_activity('temporary', current_date + 8, current_date + 1)$q$,
    'The end date cannot be before the start date');
SELECT pg_temp.expect('a new temporary activity cannot start in the past',
    $q$SELECT pg_temp.new_activity('temporary', current_date - 1, current_date + 8)$q$,
    'The start date cannot be in the past');

-- An activity that has already started: the past date is written with the trigger off
ALTER TABLE public.activities DISABLE TRIGGER activities_validate_dates;
INSERT INTO public.activities (
    id, provider_id, address_id, title, category, type, target_age_ranges, schedule,
    price, price_period, max_participants, start_date, end_date
) VALUES (
    'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001', 'Running camp', 'football', 'temporary', '{7-9}',
    '[{"day":"monday","startTime":"10:00","endTime":"12:00"}]', 10, 'per_week', 10,
    current_date - 3, current_date + 3
);
ALTER TABLE public.activities ENABLE TRIGGER activities_validate_dates;

SELECT set_config('request.jwt.claims',
    '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true) IS NULL;
SET LOCAL ROLE authenticated;

SELECT pg_temp.expect('the end date of a started activity can be extended',
    $q$UPDATE public.activities SET end_date = current_date + 10, start_date = start_date, type = type
       WHERE id = 'c0000000-0000-0000-0000-000000000001'$q$);
SELECT pg_temp.expect('the start date cannot move to another past date',
    $q$UPDATE public.activities SET start_date = current_date - 2
       WHERE id = 'c0000000-0000-0000-0000-000000000001'$q$,
    'The start date cannot be in the past');
SELECT pg_temp.expect('a temporary activity can become whole-year without dates',
    $q$UPDATE public.activities SET type = 'whole_year', start_date = NULL, end_date = NULL
       WHERE id = 'c0000000-0000-0000-0000-000000000001'$q$);
SELECT pg_temp.expect('a whole-year activity can become temporary',
    $q$UPDATE public.activities
       SET type = 'temporary', start_date = current_date + 1, end_date = current_date + 2
       WHERE id = 'c0000000-0000-0000-0000-000000000001'$q$);
SELECT pg_temp.expect('becoming temporary with a past start date is rejected',
    $q$UPDATE public.activities SET type = 'whole_year', start_date = NULL, end_date = NULL
       WHERE id = 'c0000000-0000-0000-0000-000000000001';
       UPDATE public.activities
       SET type = 'temporary', start_date = current_date - 1, end_date = current_date + 2
       WHERE id = 'c0000000-0000-0000-0000-000000000001'$q$,
    'The start date cannot be in the past');
SELECT pg_temp.expect('the type cannot change while keeping the dates',
    $q$UPDATE public.activities SET type = 'whole_year'
       WHERE id = 'c0000000-0000-0000-0000-000000000001'$q$,
    'Whole-year activities cannot have dates');

RESET ROLE;

-- Activity published with an address from before the structured fields
ALTER TABLE public.addresses DISABLE TRIGGER require_structured_address_on_insert;
INSERT INTO public.addresses (id, provider_id, address, street, city, country)
VALUES ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
        'C/ Vella 2', 'C/ Vella 2', 'Lleida', 'Spain');
ALTER TABLE public.addresses ENABLE TRIGGER require_structured_address_on_insert;

ALTER TABLE public.activities DISABLE TRIGGER activities_require_publication_fields;
INSERT INTO public.activities (
    id, provider_id, address_id, title, category, target_age_ranges, schedule,
    price, price_period, max_participants, status
) VALUES (
    'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002', 'Older activity', 'football', '{7-9}',
    '[{"day":"monday","startTime":"10:00","endTime":"12:00"}]', 10, 'per_month', 10, 'published'
);
ALTER TABLE public.activities ENABLE TRIGGER activities_require_publication_fields;

SET LOCAL ROLE authenticated;

SELECT pg_temp.expect('a published activity with an older address can be edited',
    $q$UPDATE public.activities
       SET title = 'Edited', category = 'football', type = 'whole_year', start_date = NULL,
           end_date = NULL, address_id = 'b0000000-0000-0000-0000-000000000002'
       WHERE id = 'c0000000-0000-0000-0000-000000000002'$q$);
SELECT pg_temp.expect('changing a checked field still runs the publication check',
    $q$UPDATE public.activities SET category = 'tennis'
       WHERE id = 'c0000000-0000-0000-0000-000000000002'$q$,
    'A complete structured address is required to publish');

ROLLBACK;
