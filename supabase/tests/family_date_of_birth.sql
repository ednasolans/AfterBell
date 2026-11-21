-- #151: the age of a family profile comes only from its date of birth.
-- Run on the local database; everything is rolled back:
--   docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/family_date_of_birth.sql
-- Every line of the result must start with "ok".

\set QUIET on
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
    ('b1510000-0000-0000-0000-0000000000f1', 'dob-family@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated');

-- Runs a statement and prints "ok" if it fails with the expected message
-- (a LIKE pattern), or if it succeeds when no message is expected
CREATE FUNCTION pg_temp.expect(p_name text, p_sql text, p_message text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
    EXECUTE p_sql;
    IF p_message IS NULL THEN RETURN 'ok   ' || p_name; END IF;
    RETURN 'FAIL ' || p_name || ': no error';
EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE p_message THEN RETURN 'ok   ' || p_name; END IF;
    RETURN 'FAIL ' || p_name || ': ' || SQLERRM;
END;
$$;

CREATE FUNCTION pg_temp.check(p_name text, p_actual text, p_expected text)
RETURNS text LANGUAGE sql AS $$
    SELECT CASE WHEN p_actual IS NOT DISTINCT FROM p_expected THEN 'ok   ' || p_name
                ELSE 'FAIL ' || p_name || ': got ' || coalesce(p_actual, 'NULL') END;
$$;

-- An insert of the family, with the given date of birth (SQL text)
CREATE FUNCTION pg_temp.insert_profile(p_date text)
RETURNS text LANGUAGE sql AS $$
    SELECT format(
        'INSERT INTO public.family_profiles (family_group_id, first_name, date_of_birth, interests)
         SELECT family_group_id, %L, %s, ''{music}''
         FROM public.family_group_members WHERE account_id = %L',
        'Nil', p_date, 'b1510000-0000-0000-0000-0000000000f1');
$$;

DO $$ BEGIN
    PERFORM set_config('request.jwt.claims',
        json_build_object('sub', 'b1510000-0000-0000-0000-0000000000f1', 'role', 'authenticated')::text, true);
END $$;
SET LOCAL ROLE authenticated;

SELECT pg_temp.expect('a profile needs a date of birth',
    pg_temp.insert_profile('NULL'),
    'null value in column "date_of_birth"%');
SELECT pg_temp.expect('a date of birth in the future is rejected',
    pg_temp.insert_profile('current_date + 1'),
    'Date of birth cannot be in the future');
SELECT pg_temp.expect('a date of birth before 1900 is rejected',
    pg_temp.insert_profile($q$DATE '1899-12-31'$q$),
    'new row for relation "family_profiles" violates check constraint "family_dob_reasonable"%');
SELECT pg_temp.expect('a date of birth on 1900-01-01 is accepted',
    pg_temp.insert_profile($q$DATE '1900-01-01'$q$));
SELECT pg_temp.expect('a date of birth today is accepted',
    pg_temp.insert_profile('current_date'));
SELECT pg_temp.expect('the date of birth cannot be removed',
    $q$UPDATE public.family_profiles SET date_of_birth = NULL WHERE first_name = 'Nil'$q$,
    'null value in column "date_of_birth"%');

RESET ROLE;

SELECT pg_temp.check('the age range column no longer exists',
    (SELECT count(*)::text FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'family_profiles' AND column_name = 'age_range'),
    '0');
SELECT pg_temp.check('the provider requests no longer return an age range',
    (SELECT count(*)::text FROM information_schema.routines r
     JOIN information_schema.parameters p ON p.specific_name = r.specific_name
     WHERE r.routine_name = 'provider_enrolment_requests' AND p.parameter_name = 'family_profile_age_range'),
    '0');

ROLLBACK;
