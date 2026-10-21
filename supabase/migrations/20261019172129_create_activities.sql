-- ============================================================
-- AfterBell - Issue #32
-- Activity creation and management
-- ============================================================


-- ============================================================
-- 1. ACTIVITIES TABLE
-- ============================================================

CREATE TABLE public.activities (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    provider_id UUID NOT NULL
        DEFAULT auth.uid()
        REFERENCES public.accounts(id)
        ON DELETE CASCADE,

    title TEXT NOT NULL
        CHECK (btrim(title) <> '' AND char_length(title) <= 120),

    description TEXT
        CHECK (char_length(description) <= 1000),

    -- Not used for filtering until Sprint 2, added now to avoid a data migration
    category TEXT NOT NULL
        CHECK (category IN (
            'football', 'basketball', 'tennis', 'swimming', 'dance',
            'drama', 'music', 'language', 'art', 'tutoring', 'other'
        )),

    type TEXT NOT NULL
        DEFAULT 'whole_year'
        CHECK (type IN ('whole_year', 'event')),

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

    price_min NUMERIC(8, 2) NOT NULL
        CHECK (price_min >= 0),

    price_max NUMERIC(8, 2) NOT NULL
        CHECK (price_max >= 0),

    price_period TEXT NOT NULL
        CHECK (price_period IN (
            'per_hour', 'per_day', 'per_week', 'per_month', 'per_term', 'per_year'
        )),

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    CONSTRAINT activity_price_range_is_valid
        CHECK (price_max >= price_min)

);

CREATE INDEX activities_provider_id_idx
    ON public.activities (provider_id);


-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.activities
ENABLE ROW LEVEL SECURITY;


-- Any logged-in user can see activities, so families can sign up for them.

CREATE POLICY "Logged-in users can read activities"

ON public.activities

FOR SELECT

TO authenticated

USING (true);


-- Only company accounts can create activities, and only for themselves.

CREATE POLICY "Companies can create their own activities"

ON public.activities

FOR INSERT

TO authenticated

WITH CHECK (
    (SELECT auth.uid()) = provider_id
    AND (SELECT public.is_company())
);


-- Providers can update only their own activities.

CREATE POLICY "Providers can update their own activities"

ON public.activities

FOR UPDATE

TO authenticated

USING (
    (SELECT auth.uid()) = provider_id
)

WITH CHECK (
    (SELECT auth.uid()) = provider_id
);


-- Providers can delete only their own activities (permanent delete).

CREATE POLICY "Providers can delete their own activities"

ON public.activities

FOR DELETE

TO authenticated

USING (
    (SELECT auth.uid()) = provider_id
);


-- ============================================================
-- 3. TABLE PRIVILEGES
-- ============================================================

REVOKE ALL
ON TABLE public.activities
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, DELETE
ON TABLE public.activities
TO authenticated;

-- id, provider_id, type and created_at cannot be changed after creation.

GRANT UPDATE (
    title, description, category, target_age_ranges, schedule,
    price_min, price_max, price_period
)
ON TABLE public.activities
TO authenticated;