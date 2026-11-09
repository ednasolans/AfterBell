
-- #96 - Tutor registration and ownership.
-- Run locally with psql -v ON_ERROR_STOP=1.

BEGIN;

-- =========================================================
-- 1. Register two tutors and one customer
-- =========================================================

INSERT INTO auth.users (
    id, email, raw_user_meta_data, aud, role
)
VALUES
(
    '96000000-0000-4000-8000-000000000001',
    'anna-96@test.com',
    '{
      "account_type": "tutor",
      "first_name": "Anna",
      "last_name": "Soler",
      "presentation": "Mathematics tutor",
      "street": "Carrer Major",
      "number": "10",
      "postal_code": "25001",
      "city": "Lleida",
      "province": "Lleida",
      "country": "Spain"
    }',
    'authenticated',
    'authenticated'
),
(
    '96000000-0000-4000-8000-000000000002',
    'marc-96@test.com',
    '{
      "account_type": "tutor",
      "first_name": "Marc",
      "last_name": "Serra",
      "presentation": "Physics tutor",
      "street": "Carrer Nou",
      "number": "5",
      "postal_code": "08001",
      "city": "Barcelona",
      "province": "Barcelona",
      "country": "Spain"
    }',
    'authenticated',
    'authenticated'
),
(
    '96000000-0000-4000-8000-000000000003',
    'customer-96@test.com',
    '{"account_type":"customer"}',
    'authenticated',
    'authenticated'
);

-- Verify registration and the automatic inserts.
DO $$
BEGIN
    IF (
        SELECT count(*)
        FROM public.accounts
        WHERE account_type = 'tutor'
          AND id IN (
            '96000000-0000-4000-8000-000000000001',
            '96000000-0000-4000-8000-000000000002'
          )
    ) <> 2 THEN
        RAISE EXCEPTION 'Tutor accounts were not created';
    END IF;

    IF (
        SELECT count(*)
        FROM public.technical_sheets
        WHERE provider_type = 'private_tutor'
          AND provider_id IN (
            '96000000-0000-4000-8000-000000000001',
            '96000000-0000-4000-8000-000000000002'
          )
    ) <> 2 THEN
        RAISE EXCEPTION 'Tutor sheets were not created';
    END IF;

    IF (
        SELECT count(*)
        FROM public.addresses
        WHERE provider_id IN (
            '96000000-0000-4000-8000-000000000001',
            '96000000-0000-4000-8000-000000000002'
        )
    ) <> 2 THEN
        RAISE EXCEPTION 'Tutor addresses were not created';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.family_group_members
        WHERE account_id =
            '96000000-0000-4000-8000-000000000001'
    ) THEN
        RAISE EXCEPTION 'Tutor cannot have a family group';
    END IF;
END;
$$;

-- =========================================================
-- 2. Invalid registration must fail atomically
-- =========================================================

DO $$
DECLARE
    invalid_id uuid :=
        '96000000-0000-4000-8000-000000000004';
    rejected boolean := false;
BEGIN
    BEGIN
        INSERT INTO auth.users (
            id, email, raw_user_meta_data, aud, role
        )
        VALUES (
            invalid_id,
            'invalid-96@test.com',
            '{
              "account_type": "tutor",
              "first_name": "Test",
              "last_name": "Tutor",
              "presentation": "Teaching",
              "street": "Carrer Major",
              "number": "2",
              "postal_code": "99999",
              "city": "Lleida",
              "province": "Lleida",
              "country": "Spain"
            }',
            'authenticated', 'authenticated'
        );
    EXCEPTION WHEN check_violation THEN
        rejected := true;
    END;

    IF NOT rejected THEN
        RAISE EXCEPTION 'Invalid registration was accepted';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.accounts WHERE id = invalid_id
    ) OR EXISTS (
        SELECT 1 FROM public.addresses
        WHERE provider_id = invalid_id
    ) THEN
        RAISE EXCEPTION 'Partial tutor registration found';
    END IF;
END;
$$;

-- =========================================================
-- 3. Tutor A: can read and update own profile
-- =========================================================

SELECT set_config(
    'request.jwt.claims',
    '{"sub":"96000000-0000-4000-8000-000000000001",
      "role":"authenticated"}',
    true
);

SET LOCAL ROLE authenticated;

DO $$
BEGIN
    IF (
        SELECT count(*)
        FROM public.technical_sheets
        WHERE provider_type = 'private_tutor'
    ) <> 1 THEN
        RAISE EXCEPTION 'Tutor A can read another tutor sheet';
    END IF;

    IF (
        SELECT count(*) FROM public.addresses
    ) <> 1 THEN
        RAISE EXCEPTION 'Tutor A can read another tutor address';
    END IF;
END;
$$;

-- Update the profile and structured address atomically.
SELECT public.update_my_tutor_profile(
    'Anna', 'Soler', 'Updated presentation',
    'Carrer Major', '20', '', '',
    '25001', 'Lleida', 'Lleida', 'Spain'
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.technical_sheets
        WHERE first_name = 'Anna'
          AND last_name = 'Soler'
          AND description = 'Updated presentation'
    ) THEN
        RAISE EXCEPTION 'Tutor profile update failed';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.addresses
        WHERE number = '20'
          AND city = 'Lleida'
    ) THEN
        RAISE EXCEPTION 'Tutor address update failed';
    END IF;
END;
$$;

-- Another tutor's sheet must not be editable.
DO $$
DECLARE
    affected integer;
BEGIN
    UPDATE public.technical_sheets
    SET description = 'Illegal update'
    WHERE provider_id =
        '96000000-0000-4000-8000-000000000002';

    GET DIAGNOSTICS affected = ROW_COUNT;

    IF affected <> 0 THEN
        RAISE EXCEPTION 'Tutor A edited tutor B sheet';
    END IF;
END;
$$;

-- The owning account id must not be editable.
DO $$
DECLARE
    denied boolean := false;
BEGIN
    BEGIN
        UPDATE public.technical_sheets
        SET provider_id =
            '96000000-0000-4000-8000-000000000002';
    EXCEPTION WHEN insufficient_privilege THEN
        denied := true;
    END;

    IF NOT denied THEN
        RAISE EXCEPTION 'Changing the owner was permitted';
    END IF;
END;
$$;

-- An invalid address cannot be saved.
DO $$
DECLARE
    rejected boolean := false;
BEGIN
    BEGIN
        PERFORM public.update_my_tutor_profile(
            'Anna', 'Soler', 'Invalid update',
            'Carrer Major', '30', '', '',
            '99999', 'Lleida', 'Lleida', 'Spain'
        );
    EXCEPTION WHEN check_violation THEN
        rejected := true;
    END;

    IF NOT rejected THEN
        RAISE EXCEPTION 'Invalid update was accepted';
    END IF;

    -- The failed RPC must not modify the presentation either.
    IF NOT EXISTS (
        SELECT 1 FROM public.technical_sheets
        WHERE description = 'Updated presentation'
    ) THEN
        RAISE EXCEPTION 'Invalid update was not atomic';
    END IF;
END;
$$;

RESET ROLE;

-- =========================================================
-- 4. Customer cannot read private tutor data
-- =========================================================

SELECT set_config(
    'request.jwt.claims',
    '{"sub":"96000000-0000-4000-8000-000000000003",
      "role":"authenticated"}',
    true
);

SET LOCAL ROLE authenticated;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.technical_sheets
        WHERE provider_type = 'private_tutor'
    ) THEN
        RAISE EXCEPTION 'Customer can read tutor sheets';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.addresses
        WHERE city IN ('Lleida', 'Barcelona')
          AND provider_id IN (
            '96000000-0000-4000-8000-000000000001',
            '96000000-0000-4000-8000-000000000002'
          )
    ) THEN
        RAISE EXCEPTION 'Customer can read tutor addresses';
    END IF;
END;
$$;

RESET ROLE;

ROLLBACK;
