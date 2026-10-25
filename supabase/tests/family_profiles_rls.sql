
-- ============================================================
-- AfterBell - Issue #18
-- Family groups and family profiles RLS tests
-- Run only against local Supabase.
-- ============================================================

-- Run the whole script inside a transaction,
-- leaving the database unchanged.

BEGIN;

-- Create two customers and one company.
-- These users are for SQL tests, not app login.

INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data,
    aud,
    role
)
VALUES
(
    '10000000-0000-4000-8000-000000000001',
    'family-a-18@test.com',
    '{"account_type":"customer"}',
    'authenticated',
    'authenticated'
),
(
    '10000000-0000-4000-8000-000000000002',
    'family-b-18@test.com',
    '{"account_type":"customer"}',
    'authenticated',
    'authenticated'
),
(
    '10000000-0000-4000-8000-000000000003',
    'company-18@test.com',
    '{"account_type":"company"}',
    'authenticated',
    'authenticated'
);

-- The accounts trigger must create:
-- 2 customer accounts with family memberships,
-- 1 company account without family membership.

DO $$
BEGIN
    IF (
        SELECT COUNT(*)
        FROM public.family_group_members
        WHERE account_id IN (
            '10000000-0000-4000-8000-000000000001',
            '10000000-0000-4000-8000-000000000002'
        )
    ) <> 2 THEN
        RAISE EXCEPTION
            'Expected two customer memberships';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.family_group_members
        WHERE account_id =
            '10000000-0000-4000-8000-000000000003'
    ) THEN
        RAISE EXCEPTION
            'Company must not have family membership';
    END IF;
END;
$$;



-- ============================================================
-- CUSTOMER A: allowed access to own group
-- ============================================================

SELECT set_config(
    'request.jwt.claims',
    '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
    TRUE
);

SET LOCAL ROLE authenticated;

-- Create a family profile in Customer A's group.
INSERT INTO public.family_profiles (
    family_group_id,
    first_name,
    age_range,
    interests
)
SELECT
    m.family_group_id,
    'Pau',
    '7-9',
    ARRAY['football', 'swimming']::TEXT[]
FROM public.family_group_members m
WHERE m.account_id =
    '10000000-0000-4000-8000-000000000001';

-- Create another profile in the same group.
INSERT INTO public.family_profiles (
    family_group_id,
    first_name,
    age_range,
    interests
)
SELECT
    m.family_group_id,
    'Laia',
    '4-6',
    ARRAY['art', 'music']::TEXT[]
FROM public.family_group_members m
WHERE m.account_id =
    '10000000-0000-4000-8000-000000000001';

-- Verify that two profiles are visible.
DO $$
BEGIN
    IF (
        SELECT COUNT(*)
        FROM public.family_profiles
    ) <> 2 THEN
        RAISE EXCEPTION
            'Customer A should see two profiles';
    END IF;
END;
$$;

-- Customer A can edit its own family profile.
UPDATE public.family_profiles
SET first_name = 'Pau Updated'
WHERE first_name = 'Pau';

-- Verify the update.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.family_profiles
        WHERE first_name = 'Pau Updated'
    ) THEN
        RAISE EXCEPTION 'Customer A update failed';
    END IF;
END;
$$;

RESET ROLE;



-- ============================================================
-- CUSTOMER B: cannot see Customer A's profiles
-- ============================================================

SELECT set_config(
    'request.jwt.claims',
    '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',
    TRUE
);

SET LOCAL ROLE authenticated;

DO $$
BEGIN
    IF (
        SELECT COUNT(*)
        FROM public.family_profiles
    ) <> 0 THEN
        RAISE EXCEPTION
            'Customer B can see Customer A profiles';
    END IF;
END;
$$;

-- Attempt to update Customer A's profile.
-- RLS should make this affect zero rows.
DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE public.family_profiles
    SET first_name = 'Illegal update'
    WHERE first_name = 'Pau Updated';

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    IF affected_rows <> 0 THEN
        RAISE EXCEPTION
            'Customer B updated another family profile';
    END IF;
END;
$$;

-- Attempt to delete Customer A's profile.
-- RLS should make this affect zero rows.
DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    DELETE FROM public.family_profiles
    WHERE first_name = 'Pau Updated';

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    IF affected_rows <> 0 THEN
        RAISE EXCEPTION
            'Customer B deleted another family profile';
    END IF;
END;
$$;

RESET ROLE;



-- ============================================================
-- CUSTOMER B: allowed access to own group
-- ============================================================


-- ============================================================
-- CUSTOMER B: allowed access to own group
-- Issue #20: protect main profile, delete secondary profile
-- ============================================================

SELECT set_config(
    'request.jwt.claims',
    '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',
    TRUE
);

SET LOCAL ROLE authenticated;

-- Create Customer B's first profile.
-- This will be the protected main profile.

INSERT INTO public.family_profiles (
    family_group_id,
    first_name,
    age_range,
    interests
)
SELECT
    m.family_group_id,
    'Biel',
    '10-12',
    ARRAY['tennis']::TEXT[]
FROM public.family_group_members m
WHERE m.account_id =
    '10000000-0000-4000-8000-000000000002';

-- Verify that Customer B sees exactly one profile.

DO $$
BEGIN
    IF (
        SELECT COUNT(*)
        FROM public.family_profiles
    ) <> 1 THEN
        RAISE EXCEPTION
            'Customer B should see exactly one profile';
    END IF;
END;
$$;

-- Issue #20:
-- The first profile must not be deleted.
-- The trigger should reject the DELETE with SQLSTATE 23514.

DO $$
DECLARE
    deletion_rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        DELETE FROM public.family_profiles
        WHERE first_name = 'Biel';

    EXCEPTION
        WHEN SQLSTATE '23514' THEN
            deletion_rejected := TRUE;
    END;

    IF NOT deletion_rejected THEN
        RAISE EXCEPTION
            'Main profile deletion was not rejected';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.family_profiles
        WHERE first_name = 'Biel'
    ) THEN
        RAISE EXCEPTION
            'Main profile Biel should still exist';
    END IF;
END;
$$;


-- Ensure Biel is unambiguously the oldest profile.
-- PostgreSQL now() returns the same timestamp throughout
-- a transaction, so pg_sleep() does not change created_at.
--
-- Temporarily return to the privileged test role to adjust
-- fixture data. Application users cannot modify created_at.

RESET ROLE;

UPDATE public.family_profiles
SET created_at = created_at - INTERVAL '1 minute'
WHERE first_name = 'Biel';

-- Restore Customer B's authenticated role.
SET LOCAL ROLE authenticated;


-- Create a second profile in Customer B's family.

INSERT INTO public.family_profiles (
    family_group_id,
    first_name,
    age_range,
    interests
)
SELECT
    m.family_group_id,
    'Nora',
    '7-9',
    ARRAY['music']::TEXT[]
FROM public.family_group_members m
WHERE m.account_id =
    '10000000-0000-4000-8000-000000000002';

-- Verify that Customer B now sees two profiles.

DO $$
BEGIN
    IF (
        SELECT COUNT(*)
        FROM public.family_profiles
    ) <> 2 THEN
        RAISE EXCEPTION
            'Customer B should see exactly two profiles';
    END IF;
END;
$$;

-- Customer B can delete the secondary profile.

DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    DELETE FROM public.family_profiles
    WHERE first_name = 'Nora';

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    IF affected_rows <> 1 THEN
        RAISE EXCEPTION
            'Customer B should delete exactly one secondary profile';
    END IF;
END;
$$;

-- Verify that Nora disappeared and Biel remains.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.family_profiles
        WHERE first_name = 'Nora'
    ) THEN
        RAISE EXCEPTION
            'Secondary profile Nora was not deleted';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.family_profiles
        WHERE first_name = 'Biel'
    ) THEN
        RAISE EXCEPTION
            'Main profile Biel was deleted';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM public.family_profiles
    ) <> 1 THEN
        RAISE EXCEPTION
            'Customer B should have exactly one remaining profile';
    END IF;
END;
$$;

RESET ROLE;




-- ============================================================
-- COMPANY: cannot read family profiles
-- ============================================================

SELECT set_config(
    'request.jwt.claims',
    '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',
    TRUE
);

SET LOCAL ROLE authenticated;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.family_profiles
    ) THEN
        RAISE EXCEPTION
            'Company can read family profiles';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.family_groups
    ) THEN
        RAISE EXCEPTION
            'Company can read family groups';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.family_group_members
    ) THEN
        RAISE EXCEPTION
            'Company can read family memberships';
    END IF;
END;
$$;

RESET ROLE;


-- Roll back all test data.
ROLLBACK;