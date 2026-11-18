-- C2 (#81, #82): regenerate, edit, approve and discard the AI profile.
-- Run on the local database; everything is rolled back:
--   docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/provider_profile_review.sql
-- Every line of the result must start with "ok".

BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
    ('b2000000-0000-0000-0000-00000000000a', 'review-club-a@test.com',
     '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('b2000000-0000-0000-0000-00000000000b', 'review-club-b@test.com',
     '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('b2000000-0000-0000-0000-00000000000c', 'review-family@test.com',
     '{"account_type":"customer"}', 'authenticated', 'authenticated');

INSERT INTO public.addresses (id, provider_id, street, number, postal_code, city, province, country)
VALUES ('b3000000-0000-0000-0000-00000000000a', 'b2000000-0000-0000-0000-00000000000a',
        'C/ Major', '1', '25001', 'Lleida', 'Lleida', 'Spain');

INSERT INTO public.technical_sheets (provider_id, name, provider_type, activity_types, address_id, email)
VALUES ('b2000000-0000-0000-0000-00000000000a', 'Club A', 'sports_club', '{football}',
        'b3000000-0000-0000-0000-00000000000a', 'club-a@test.com');

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

GRANT EXECUTE ON FUNCTION pg_temp.expect(text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION pg_temp.expect_value(text, text, text) TO authenticated, anon;

-- What customers see of club A: the approved headline, or NULL
CREATE VIEW pg_temp.public_headline_a AS
    SELECT headline FROM public.public_approved_provider_profiles()
    WHERE provider_id = 'b2000000-0000-0000-0000-00000000000a';
GRANT SELECT ON pg_temp.public_headline_a TO authenticated;

\pset tuples_only on
\pset format unaligned

-- ============================================================
-- Club A: first draft and approval
-- ============================================================

SET LOCAL request.jwt.claims = '{"sub":"b2000000-0000-0000-0000-00000000000a","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT pg_temp.expect('the AI saves a first draft',
    $q$INSERT INTO public.provider_profiles (headline, description, model)
       VALUES ('First headline', 'First description', 'test-model')$q$);

SELECT pg_temp.expect_value('a new profile is not outdated',
    $q$SELECT public.my_profile_is_outdated()::text$q$, 'false');

SELECT pg_temp.expect_value('customers do not see a draft',
    $q$SELECT count(*)::text FROM pg_temp.public_headline_a$q$, '0');

SELECT pg_temp.expect('the owner approves the draft',
    $q$UPDATE public.provider_profiles SET status = 'approved'$q$);

SELECT pg_temp.expect_value('customers see the approved profile',
    $q$SELECT headline FROM pg_temp.public_headline_a$q$, 'First headline');

RESET ROLE;

-- Pretend the profile was approved some time ago
ALTER TABLE public.provider_profiles DISABLE TRIGGER set_profile_approved_at;
UPDATE public.provider_profiles SET approved_at = '2026-01-01 10:00+00'
WHERE provider_id = 'b2000000-0000-0000-0000-00000000000a';
ALTER TABLE public.provider_profiles ENABLE TRIGGER set_profile_approved_at;

-- ============================================================
-- Club A: editing an approved profile needs a new approval
-- ============================================================

SET LOCAL ROLE authenticated;

SELECT pg_temp.expect_value('editing the approved text moves it to pending approval',
    $q$UPDATE public.provider_profiles SET headline = 'Edited headline'
       RETURNING status$q$, 'pending_approval');

SELECT pg_temp.expect_value('customers still see the approved text while it is pending',
    $q$SELECT headline FROM pg_temp.public_headline_a$q$, 'First headline');

SELECT pg_temp.expect_value('going back to the approved version',
    $q$SELECT public.discard_profile_changes()::text$q$, 'true');

SELECT pg_temp.expect_value('discarding restores the approved text and status',
    $q$SELECT headline || ' / ' || status FROM public.provider_profiles$q$,
    'First headline / approved');

SELECT pg_temp.expect_value('discarding keeps the approval date',
    $q$SELECT approved_at::date::text FROM public.provider_profiles$q$, '2026-01-01');

SELECT pg_temp.expect_value('there is nothing to discard on an approved profile',
    $q$SELECT public.discard_profile_changes()::text$q$, 'false');

-- ============================================================
-- Club A: regenerating after the technical sheet changed
-- ============================================================

RESET ROLE;

-- The provider changes the technical sheet a minute later
ALTER TABLE public.technical_sheets DISABLE TRIGGER technical_sheets_touch_updated_at;
UPDATE public.technical_sheets SET updated_at = now() + interval '1 minute'
WHERE provider_id = 'b2000000-0000-0000-0000-00000000000a';
ALTER TABLE public.technical_sheets ENABLE TRIGGER technical_sheets_touch_updated_at;

SET LOCAL ROLE authenticated;

SELECT pg_temp.expect_value('the profile is outdated after the sheet changes',
    $q$SELECT public.my_profile_is_outdated()::text$q$, 'true');

SELECT pg_temp.expect_value('a manual edit does not hide the outdated warning',
    $q$WITH edited AS (
           UPDATE public.provider_profiles SET description = 'Edited by hand' RETURNING 1
       ) SELECT public.my_profile_is_outdated()::text FROM edited$q$, 'true');

SELECT pg_temp.expect('the AI regenerates the profile from the current sheet',
    $q$UPDATE public.provider_profiles
       SET headline = 'New AI headline', description = 'New AI description',
           model = 'test-model', generated_at = now(), status = 'pending_approval'$q$);

SELECT pg_temp.expect_value('the regenerated profile is no longer outdated',
    $q$SELECT public.my_profile_is_outdated()::text$q$, 'false');

SELECT pg_temp.expect_value('customers keep the approved text until it is approved',
    $q$SELECT headline FROM pg_temp.public_headline_a$q$, 'First headline');

SELECT pg_temp.expect('the owner approves the regenerated profile',
    $q$UPDATE public.provider_profiles SET status = 'approved'$q$);

SELECT pg_temp.expect_value('customers see the new text once it is approved',
    $q$SELECT headline FROM pg_temp.public_headline_a$q$, 'New AI headline');

SELECT pg_temp.expect_value('approving a different text gives it a new date',
    $q$SELECT (approved_at::date <> '2026-01-01')::text FROM public.provider_profiles$q$,
    'true');

-- ============================================================
-- Club A: columns only the database can change
-- ============================================================

SELECT pg_temp.expect('the app cannot hide the outdated warning',
    $q$UPDATE public.provider_profiles SET sheet_updated_at = now() + interval '1 day'$q$,
    'permission denied for table provider_profiles');

SELECT pg_temp.expect('the app cannot change the approved copy',
    $q$UPDATE public.provider_profiles SET approved_headline = 'Hacked'$q$,
    'permission denied for table provider_profiles');

RESET ROLE;

-- ============================================================
-- Club B and the customer: only their own profile
-- ============================================================

SET LOCAL request.jwt.claims = '{"sub":"b2000000-0000-0000-0000-00000000000b","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT pg_temp.expect_value('another provider cannot read the profile row',
    $q$SELECT count(*)::text FROM public.provider_profiles$q$, '0');

SELECT pg_temp.expect_value('another provider has nothing to discard',
    $q$SELECT public.discard_profile_changes()::text$q$, 'false');

SELECT pg_temp.expect_value('a provider without profile is not outdated',
    $q$SELECT public.my_profile_is_outdated()::text$q$, 'false');

RESET ROLE;

SET LOCAL request.jwt.claims = '{"sub":"b2000000-0000-0000-0000-00000000000c","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT pg_temp.expect_value('a customer sees only the approved text',
    $q$SELECT headline FROM pg_temp.public_headline_a$q$, 'New AI headline');

SELECT pg_temp.expect_value('a customer cannot read the profile row',
    $q$SELECT count(*)::text FROM public.provider_profiles$q$, '0');

RESET ROLE;

SET LOCAL ROLE anon;

SELECT pg_temp.expect('users without a session cannot discard',
    $q$SELECT public.discard_profile_changes()$q$,
    'permission denied for function discard_profile_changes');

SELECT pg_temp.expect('users without a session cannot check the profile',
    $q$SELECT public.my_profile_is_outdated()$q$,
    'permission denied for function my_profile_is_outdated');

RESET ROLE;

ROLLBACK;