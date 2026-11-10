
-- C5 / #97: Tutor offer integration tests.
-- Run against the local Supabase database.
-- All changes are rolled back.

\set ON_ERROR_STOP on

BEGIN;

-- Create two accounts, initially as companies,
-- so the #96 tutor registration trigger is not invoked
-- without its required registration metadata.
INSERT INTO auth.users (
    id, email, raw_user_meta_data, aud, role
) VALUES
(
    'a9700000-0000-0000-0000-000000000001',
    'tutor-a-97@test.com',
    '{"account_type":"company"}',
    'authenticated', 'authenticated'
),
(
    'a9700000-0000-0000-0000-000000000002',
    'tutor-b-97@test.com',
    '{"account_type":"company"}',
    'authenticated', 'authenticated'
),
(
    'a9700000-0000-0000-0000-000000000003',
    'customer-97@test.com',
    '{"account_type":"customer"}',
    'authenticated', 'authenticated'
);

-- Set the first two accounts to tutor as database admin.
UPDATE public.accounts
SET account_type = 'tutor'
WHERE id IN (
    'a9700000-0000-0000-0000-000000000001',
    'a9700000-0000-0000-0000-000000000002'
);

INSERT INTO public.addresses (
    id, provider_id, street, number,
    postal_code, city, province, country
) VALUES
(
    'b9700000-0000-0000-0000-000000000001',
    'a9700000-0000-0000-0000-000000000001',
    'Carrer Major', '10',
    '25001', 'Lleida', 'Lleida', 'Spain'
),
(
    'b9700000-0000-0000-0000-000000000002',
    'a9700000-0000-0000-0000-000000000002',
    'Carrer Nou', '20',
    '25002', 'Lleida', 'Lleida', 'Spain'
);

-- The #96 migration must support inserting a tutor sheet.

INSERT INTO public.technical_sheets (
    id,
    provider_id,
    name,
    first_name,
    last_name,
    provider_type,
    description,
    activity_types,
    address_id,
    email
) VALUES
(
    'c9700000-0000-0000-0000-000000000001',
    'a9700000-0000-0000-0000-000000000001',
    'Anna Garcia',
    'Anna',
    'Garcia',
    'private_tutor',
    'Soc professora particular de matemàtiques i ofereixo classes de reforç.',
    ARRAY['tutoring'],
    'b9700000-0000-0000-0000-000000000001',
    'tutor-a-97@test.com'
),
(
    'c9700000-0000-0000-0000-000000000002',
    'a9700000-0000-0000-0000-000000000002',
    'Marc Puig',
    'Marc',
    'Puig',
    'private_tutor',
    'Soc professor particular de física i ofereixo classes personalitzades.',
    ARRAY['tutoring'],
    'b9700000-0000-0000-0000-000000000002',
    'tutor-b-97@test.com'
);



-- SQL assertions fail immediately if an expectation is false.
CREATE FUNCTION pg_temp.assert_true(
    condition boolean,
    message text
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    IF condition IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'FAILED: %', message;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION
pg_temp.assert_true(boolean, text)
TO authenticated;

-- Tutor A
SET LOCAL request.jwt.claims =
'{"sub":"a9700000-0000-0000-0000-000000000001","role":"authenticated"}';

SET LOCAL ROLE authenticated;

-- Catalogue available to authenticated users.
SELECT pg_temp.assert_true(
    EXISTS (
        SELECT 1 FROM public.tutor_subjects
        WHERE code = 'mathematics'
    ),
    'Subject catalogue'
);

SELECT pg_temp.assert_true(
    EXISTS (
        SELECT 1 FROM public.tutor_levels
        WHERE code = 'secondary'
    ),
    'Level catalogue'
);

-- Create an incomplete draft.
INSERT INTO public.tutor_offers (
    id, tutor_id, technical_sheet_id
) VALUES (
    'd9700000-0000-0000-0000-000000000001',
    'a9700000-0000-0000-0000-000000000001',
    'c9700000-0000-0000-0000-000000000001'
);

SELECT pg_temp.assert_true(
    (
        SELECT public.tutor_offer_publication_issues(
            'd9700000-0000-0000-0000-000000000001'
        )
    ) @> ARRAY['title','subjects','levels','price'],
    'Incomplete draft lists missing fields'
);

-- Publishing incomplete data must fail.
DO $$
BEGIN
    BEGIN
        UPDATE public.tutor_offers
        SET status = 'published'
        WHERE id =
            'd9700000-0000-0000-0000-000000000001';

        RAISE EXCEPTION 'FAILED: incomplete offer published';

    EXCEPTION WHEN check_violation THEN
        NULL;
    END;
END;
$$;

-- Complete and publish the offer.
UPDATE public.tutor_offers
SET title = 'Mathematics lessons',
    description = 'Private mathematics tutoring.',
    subject_codes = ARRAY['mathematics'],
    level_codes = ARRAY['secondary'],
    price_per_hour = 20
WHERE id =
    'd9700000-0000-0000-0000-000000000001';

SELECT pg_temp.assert_true(
    cardinality(
        public.tutor_offer_publication_issues(
            'd9700000-0000-0000-0000-000000000001'
        )
    ) = 0,
    'Complete offer has no missing fields'
);

UPDATE public.tutor_offers
SET status = 'published'
WHERE id =
    'd9700000-0000-0000-0000-000000000001';

SELECT pg_temp.assert_true(
    EXISTS (
        SELECT 1 FROM public.tutor_offers
        WHERE id =
            'd9700000-0000-0000-0000-000000000001'
          AND status = 'published'
          AND category = 'tutoring'
    ),
    'Offer is published in tutoring category'
);

-- Unpublish without deleting data.
UPDATE public.tutor_offers
SET status = 'draft'
WHERE id =
    'd9700000-0000-0000-0000-000000000001';

SELECT pg_temp.assert_true(
    EXISTS (
        SELECT 1 FROM public.tutor_offers
        WHERE id =
            'd9700000-0000-0000-0000-000000000001'
          AND status = 'draft'
          AND title = 'Mathematics lessons'
    ),
    'Unpublish preserves offer data'
);

-- Publish again for visibility checks.
UPDATE public.tutor_offers
SET status = 'published'
WHERE id =
    'd9700000-0000-0000-0000-000000000001';

RESET ROLE;

-- Tutor B cannot edit Tutor A's offer.
SET LOCAL request.jwt.claims =
'{"sub":"a9700000-0000-0000-0000-000000000002","role":"authenticated"}';

SET LOCAL ROLE authenticated;

WITH changed AS (
    UPDATE public.tutor_offers
    SET title = 'Unauthorized change'
    WHERE id =
        'd9700000-0000-0000-0000-000000000001'
    RETURNING id
)
SELECT pg_temp.assert_true(
    count(*) = 0,
    'Other tutor cannot update offer'
)
FROM changed;

SELECT pg_temp.assert_true(
    public.tutor_offer_publication_issues(
        'd9700000-0000-0000-0000-000000000001'
    ) IS NULL,
    'Other tutor cannot access publication issues'
);

RESET ROLE;

-- Customer sees the published offer.
SET LOCAL request.jwt.claims =
'{"sub":"a9700000-0000-0000-0000-000000000003","role":"authenticated"}';

SET LOCAL ROLE authenticated;

SELECT pg_temp.assert_true(
    EXISTS (
        SELECT 1 FROM public.tutor_offers
        WHERE id =
            'd9700000-0000-0000-0000-000000000001'
          AND status = 'published'
    ),
    'Customer can read published offer'
);

SELECT pg_temp.assert_true(
    public.tutor_offer_publication_issues(
        'd9700000-0000-0000-0000-000000000001'
    ) IS NULL,
    'Customer cannot inspect owner publication issues'
);

RESET ROLE;

-- Unpublish as Tutor A.
SET LOCAL request.jwt.claims =
'{"sub":"a9700000-0000-0000-0000-000000000001","role":"authenticated"}';

SET LOCAL ROLE authenticated;

UPDATE public.tutor_offers
SET status = 'draft'
WHERE id =
    'd9700000-0000-0000-0000-000000000001';

RESET ROLE;

-- Customer can no longer see it.
SET LOCAL request.jwt.claims =
'{"sub":"a9700000-0000-0000-0000-000000000003","role":"authenticated"}';

SET LOCAL ROLE authenticated;

SELECT pg_temp.assert_true(
    NOT EXISTS (
        SELECT 1 FROM public.tutor_offers
        WHERE id =
            'd9700000-0000-0000-0000-000000000001'
    ),
    'Customer cannot read draft offer'
);

RESET ROLE;

ROLLBACK;
