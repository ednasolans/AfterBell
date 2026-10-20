-- ============================================================
-- AfterBell - Provider addresses
-- The technical sheet and the activities point to an address of
-- the addresses table instead of storing their own text.
-- The technical sheet also gets a short description, and two
-- facilities used by the AI sample sheets are added.
-- ============================================================


-- ============================================================
-- 1. TECHNICAL SHEETS: MAIN ADDRESS
-- ============================================================

ALTER TABLE public.technical_sheets
    ADD COLUMN address_id UUID;

-- Move the existing address and city of each sheet to the addresses table.
-- Each sheet gets the id of its new address first, so every address is
-- linked to exactly one sheet. A sheet without an address uses its city.
UPDATE public.technical_sheets
SET address_id = gen_random_uuid();

INSERT INTO public.addresses (id, provider_id, address, city)
SELECT
    address_id,
    provider_id,
    COALESCE(NULLIF(btrim(address), ''), city),
    city
FROM public.technical_sheets;

ALTER TABLE public.technical_sheets
    ALTER COLUMN address_id SET NOT NULL,

    -- Composite key: the address must belong to the same provider.
    -- NO ACTION (the default): an address in use cannot be deleted, but deleting
    -- an account still removes its sheets and addresses together.
    ADD CONSTRAINT technical_sheets_address_fkey
        FOREIGN KEY (address_id, provider_id)
        REFERENCES public.addresses (id, provider_id),

    DROP COLUMN address,
    DROP COLUMN city,

    ADD COLUMN description TEXT
        CHECK (char_length(description) <= 500),

    -- Two facilities used by the AI sample sheets
    DROP CONSTRAINT technical_sheets_facilities_check,
    ADD CONSTRAINT technical_sheets_facilities_check
        CHECK (facilities <@ ARRAY[
            'parking', 'changing_rooms', 'showers', 'lockers', 'waiting_area',
            'cafeteria', 'wifi', 'air_conditioning', 'outdoor_space',
            'wheelchair_access', 'outdoor_field', 'indoor_court'
        ]::TEXT[]);

CREATE INDEX technical_sheets_address_id_idx
    ON public.technical_sheets (address_id);

GRANT UPDATE (address_id, description)
ON TABLE public.technical_sheets
TO authenticated;


-- ============================================================
-- 2. ACTIVITIES: WHERE THEY TAKE PLACE
-- ============================================================

ALTER TABLE public.activities
    ADD COLUMN address_id UUID;

-- Existing activities take place at the main address of their provider
-- (of its newest technical sheet, if it has several).
UPDATE public.activities AS activity
SET address_id = latest_sheet.address_id
FROM (
    SELECT DISTINCT ON (provider_id) provider_id, address_id
    FROM public.technical_sheets
    ORDER BY provider_id, created_at DESC
) AS latest_sheet
WHERE latest_sheet.provider_id = activity.provider_id;

-- Activities of a provider without a technical sheet have no address to use.
-- Only test data is in this situation (the app is not in production yet).
DELETE FROM public.activities
WHERE address_id IS NULL;

ALTER TABLE public.activities
    ALTER COLUMN address_id SET NOT NULL,

    ADD CONSTRAINT activities_address_fkey
        FOREIGN KEY (address_id, provider_id)
        REFERENCES public.addresses (id, provider_id);

CREATE INDEX activities_address_id_idx
    ON public.activities (address_id);

GRANT UPDATE (address_id)
ON TABLE public.activities
TO authenticated;