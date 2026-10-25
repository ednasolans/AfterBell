-- AfterBell - Issue #29
-- RLS checks for provider_profiles.
-- Run in Supabase Studio > SQL Editor (local). Every check raises an
-- error if it fails; all test data is removed at the end.

DO $$
DECLARE
    company_a  UUID := gen_random_uuid();
    company_b  UUID := gen_random_uuid();
    customer_c UUID := gen_random_uuid();
    n INTEGER;
    approved TIMESTAMPTZ;
BEGIN
    -- Test users: the accounts trigger creates their accounts rows
    INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data) VALUES
        (company_a,  'rls-a@test.dev', 'authenticated', 'authenticated', '{"account_type":"company"}'),
        (company_b,  'rls-b@test.dev', 'authenticated', 'authenticated', '{"account_type":"company"}'),
        (customer_c, 'rls-c@test.dev', 'authenticated', 'authenticated', '{"account_type":"customer"}');

    -- Company B already has an approved profile (inserted as admin)
    INSERT INTO public.provider_profiles (provider_id, headline, description, status, model)
    VALUES (company_b, 'B headline', 'B description', 'approved', 'test');

    -- 1. Company A creates its own draft
    PERFORM set_config('request.jwt.claims', json_build_object('sub', company_a, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.provider_profiles (headline, description, model)
    VALUES ('A headline', 'A description', 'test');
    SELECT count(*) INTO n FROM public.provider_profiles WHERE provider_id = company_a;
    IF n <> 1 THEN RAISE EXCEPTION 'FAIL 1: owner cannot see own draft'; END IF;

    -- 2. Company A cannot insert an already approved profile
    BEGIN
        INSERT INTO public.provider_profiles (headline, description, model, status)
        VALUES ('x', 'y', 'test', 'approved');
        RAISE EXCEPTION 'FAIL 2: approved insert was allowed';
    EXCEPTION WHEN insufficient_privilege OR unique_violation THEN NULL;
    END;
    RESET ROLE;

    -- 3. Customer C sees approved profiles but not drafts, and cannot insert
    PERFORM set_config('request.jwt.claims', json_build_object('sub', customer_c, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO n FROM public.provider_profiles WHERE status = 'draft';
    IF n <> 0 THEN RAISE EXCEPTION 'FAIL 3a: customer can see drafts'; END IF;
    SELECT count(*) INTO n FROM public.provider_profiles WHERE provider_id = company_b;
    IF n <> 1 THEN RAISE EXCEPTION 'FAIL 3b: customer cannot see approved profile'; END IF;
    BEGIN
        INSERT INTO public.provider_profiles (headline, description, model)
        VALUES ('x', 'y', 'test');
        RAISE EXCEPTION 'FAIL 3c: customer could insert';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RESET ROLE;

    -- 4. Company B cannot see or change A's draft
    PERFORM set_config('request.jwt.claims', json_build_object('sub', company_b, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO n FROM public.provider_profiles WHERE provider_id = company_a;
    IF n <> 0 THEN RAISE EXCEPTION 'FAIL 4a: other company can see the draft'; END IF;
    UPDATE public.provider_profiles SET headline = 'hacked' WHERE provider_id = company_a;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'FAIL 4b: other company changed the draft'; END IF;
    RESET ROLE;

    -- 5. Company A edits and approves its draft; approved_at is filled by the trigger
    PERFORM set_config('request.jwt.claims', json_build_object('sub', company_a, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.provider_profiles SET description = 'A edited' WHERE provider_id = company_a;
    UPDATE public.provider_profiles SET status = 'approved' WHERE provider_id = company_a;
    SELECT approved_at INTO approved FROM public.provider_profiles WHERE provider_id = company_a;
    IF approved IS NULL THEN RAISE EXCEPTION 'FAIL 5: approved_at not set'; END IF;

    -- 6. Nobody can delete (no DELETE privilege or policy)
    BEGIN
        DELETE FROM public.provider_profiles WHERE provider_id = company_a;
        RAISE EXCEPTION 'FAIL 6: owner could delete';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RESET ROLE;

    -- 7. Logged-out users see nothing
    SET LOCAL ROLE anon;
    BEGIN
        SELECT count(*) INTO n FROM public.provider_profiles;
        RAISE EXCEPTION 'FAIL 7: anon can read profiles';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RESET ROLE;

    -- Clean up (profiles and accounts are removed by ON DELETE CASCADE)
    DELETE FROM auth.users WHERE id IN (company_a, company_b, customer_c);
END
$$;

SELECT 'All provider_profiles RLS checks passed' AS result;