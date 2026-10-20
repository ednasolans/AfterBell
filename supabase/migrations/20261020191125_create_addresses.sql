-- ============================================================
-- AfterBell - Provider addresses
-- A provider can have several addresses (e.g. a main venue and a
-- second sports centre). They are entered in the technical sheet
-- form, and each activity takes place at one of them.
-- ============================================================


-- ============================================================
-- 1. ADDRESSES TABLE
-- ============================================================

CREATE TABLE public.addresses (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    -- Filled automatically with the logged-in user
    provider_id UUID NOT NULL
        DEFAULT auth.uid()
        REFERENCES public.accounts(id)
        ON DELETE CASCADE,

    -- Street, number and any other detail, as one text
    address TEXT NOT NULL
        CHECK (btrim(address) <> '' AND char_length(address) <= 200),

    -- Separate column so activities can be searched by city
    city TEXT NOT NULL
        CHECK (btrim(city) <> '' AND char_length(city) <= 100),

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    -- Target of the composite foreign keys of technical_sheets and
    -- activities: they can only point to an address of the same provider
    CONSTRAINT addresses_id_provider_id_key
        UNIQUE (id, provider_id)

);

CREATE INDEX addresses_provider_id_idx
    ON public.addresses (provider_id);


-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.addresses
ENABLE ROW LEVEL SECURITY;


-- Any logged-in user can see addresses: families need the address of an activity.

CREATE POLICY "Logged-in users can read addresses"

ON public.addresses

FOR SELECT

TO authenticated

USING (true);


-- Only company accounts can create addresses, and only for themselves.

CREATE POLICY "Companies can create their own addresses"

ON public.addresses

FOR INSERT

TO authenticated

WITH CHECK (
    (SELECT auth.uid()) = provider_id
    AND (SELECT public.is_company())
);


-- Providers can update only their own addresses.

CREATE POLICY "Providers can update their own addresses"

ON public.addresses

FOR UPDATE

TO authenticated

USING (
    (SELECT auth.uid()) = provider_id
)

WITH CHECK (
    (SELECT auth.uid()) = provider_id
);


-- Providers can delete only their own addresses.
-- An address used by the technical sheet or an activity cannot be deleted
-- (foreign keys in the next migration).

CREATE POLICY "Providers can delete their own addresses"

ON public.addresses

FOR DELETE

TO authenticated

USING (
    (SELECT auth.uid()) = provider_id
);


-- ============================================================
-- 3. TABLE PRIVILEGES
-- ============================================================

REVOKE ALL
ON TABLE public.addresses
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, DELETE
ON TABLE public.addresses
TO authenticated;

-- id, provider_id and created_at cannot be changed after creation.

GRANT UPDATE (address, city)
ON TABLE public.addresses
TO authenticated;