-- ============================================================
-- AfterBell - Issue #22
-- Whole-year technical sheet (template 1)
-- ============================================================


-- ============================================================
-- 1. TECHNICAL SHEETS TABLE
-- ============================================================

CREATE TABLE public.technical_sheets (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    -- Filled automatically with the logged-in user
    provider_id UUID NOT NULL
        DEFAULT auth.uid()
        REFERENCES public.accounts(id)
        ON DELETE CASCADE,

    -- Basic information
    name TEXT NOT NULL
        CHECK (btrim(name) <> '' AND char_length(name) <= 120),

    provider_type TEXT NOT NULL
        CHECK (provider_type IN (
            'sports_club', 'music_school', 'language_school',
            'art_school', 'tutoring_academy', 'private_tutor'
        )),

    city TEXT NOT NULL
        CHECK (btrim(city) <> '' AND char_length(city) <= 100),

    address TEXT
        CHECK (char_length(address) <= 200),

    phone_number TEXT
        CHECK (char_length(phone_number) <= 30),

    email TEXT
        CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND char_length(email) <= 254),

    website TEXT
        CHECK (website ~* '^https?://' AND char_length(website) <= 300),

    -- Activity
    activity_types TEXT[] NOT NULL
        CHECK (
            cardinality(activity_types) > 0
            AND activity_types <@ ARRAY[
                'football', 'basketball', 'tennis', 'swimming', 'dance',
                'drama', 'music', 'language', 'art', 'tutoring', 'other'
            ]::TEXT[]
        ),

    target_age_ranges TEXT[] NOT NULL
        CHECK (
            cardinality(target_age_ranges) > 0
            AND target_age_ranges <@ ARRAY[
                '0-3', '4-6', '7-9', '10-12', '13-15', '16-17', 'adult'
            ]::TEXT[]
        ),

    -- List of { day, startTime, endTime }, validated by the app
    schedule JSONB NOT NULL
        CHECK (jsonb_typeof(schedule) = 'array' AND jsonb_array_length(schedule) > 0),

    -- Prices
    price_min NUMERIC(8, 2) NOT NULL
        CHECK (price_min >= 0),

    price_max NUMERIC(8, 2) NOT NULL
        CHECK (price_max >= 0),

    price_period TEXT NOT NULL
        DEFAULT 'per_month'
        CHECK (price_period IN (
            'per_hour', 'per_day', 'per_week', 'per_month', 'per_term', 'per_year'
        )),

    -- Facilities
    facilities TEXT[] NOT NULL
        DEFAULT '{}'
        CHECK (facilities <@ ARRAY[
            'parking', 'changing_rooms', 'showers', 'lockers', 'waiting_area',
            'cafeteria', 'wifi', 'air_conditioning', 'outdoor_space', 'wheelchair_access'
        ]::TEXT[]),

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    -- Rules that involve several columns
    CONSTRAINT price_range_is_valid
        CHECK (price_max >= price_min),

    CONSTRAINT has_phone_or_email
        CHECK (phone_number IS NOT NULL OR email IS NOT NULL)

);

CREATE INDEX technical_sheets_provider_id_idx
    ON public.technical_sheets (provider_id);

    -- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.technical_sheets
ENABLE ROW LEVEL SECURITY;


-- Providers can read only their own sheets.

CREATE POLICY "Providers can read their own technical sheets"

ON public.technical_sheets

FOR SELECT

TO authenticated

USING (
    (SELECT auth.uid()) = provider_id
);


-- Only company accounts can create sheets, and only for themselves.

CREATE POLICY "Companies can create their own technical sheets"

ON public.technical_sheets

FOR INSERT

TO authenticated

WITH CHECK (
    (SELECT auth.uid()) = provider_id
    AND (SELECT public.is_company())
);


-- Providers can update only their own sheets.

CREATE POLICY "Providers can update their own technical sheets"

ON public.technical_sheets

FOR UPDATE

TO authenticated

USING (
    (SELECT auth.uid()) = provider_id
)

WITH CHECK (
    (SELECT auth.uid()) = provider_id
);


-- ============================================================
-- 3. TABLE PRIVILEGES
-- ============================================================

REVOKE ALL
ON TABLE public.technical_sheets
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT
ON TABLE public.technical_sheets
TO authenticated;

-- id, provider_id and created_at cannot be changed after creation.

GRANT UPDATE (
    name, provider_type, city, address, phone_number, email, website,
    activity_types, target_age_ranges, schedule,
    price_min, price_max, price_period, facilities
)
ON TABLE public.technical_sheets
TO authenticated;