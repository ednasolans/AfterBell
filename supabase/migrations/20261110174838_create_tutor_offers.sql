
-- C5 / #97: Tutor subjects, levels and offers.
-- Requires #96 (tutor accounts) and #86/#87.

-- 1. Subject and level catalogues

CREATE TABLE public.tutor_subjects (
    code text PRIMARY KEY
        CHECK (code ~ '^[a-z][a-z0-9_]*$'),
    name text NOT NULL UNIQUE
        CHECK (btrim(name) <> '')
);

CREATE TABLE public.tutor_levels (
    code text PRIMARY KEY
        CHECK (code ~ '^[a-z][a-z0-9_]*$'),
    name text NOT NULL UNIQUE
        CHECK (btrim(name) <> '')
);

-- Initial example values. Confirm these with the team.
INSERT INTO public.tutor_subjects (code, name) VALUES
    ('mathematics', 'Mathematics'),
    ('english', 'English'),
    ('physics', 'Physics');

INSERT INTO public.tutor_levels (code, name) VALUES
    ('primary', 'Primary'),
    ('secondary', 'Secondary'),
    ('baccalaureate', 'Baccalaureate'),
    ('university', 'University');

ALTER TABLE public.tutor_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read tutor subjects"
ON public.tutor_subjects
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users read tutor levels"
ON public.tutor_levels
FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.tutor_subjects
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.tutor_levels
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.tutor_subjects TO authenticated;
GRANT SELECT ON public.tutor_levels TO authenticated;


-- 2. Tutor offers
-- A tutor profile is identified by an accounts row.
-- No tutor_profiles table is introduced.
-- The technical sheet belongs to the same tutor.

CREATE TABLE public.tutor_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    tutor_id uuid NOT NULL DEFAULT auth.uid()
        REFERENCES public.accounts(id) ON DELETE CASCADE,

    technical_sheet_id uuid NOT NULL
        REFERENCES public.technical_sheets(id),

    title text
        CHECK (char_length(title) <= 120),

    description text
        CHECK (char_length(description) <= 1000),

    subject_codes text[] NOT NULL DEFAULT '{}',

    level_codes text[] NOT NULL DEFAULT '{}',

    price_per_hour numeric(8, 2)
        CHECK (price_per_hour >= 0),

    category text NOT NULL DEFAULT 'tutoring'
        REFERENCES public.categories(name)
        CHECK (category = 'tutoring'),

    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published')),

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tutor_offers_tutor_idx
ON public.tutor_offers(tutor_id);

CREATE INDEX tutor_offers_status_idx
ON public.tutor_offers(status);

CREATE INDEX tutor_offers_subjects_idx
ON public.tutor_offers USING gin(subject_codes);

CREATE INDEX tutor_offers_levels_idx
ON public.tutor_offers USING gin(level_codes);

CREATE TRIGGER tutor_offers_touch_updated_at
BEFORE UPDATE ON public.tutor_offers
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();


-- 3. Validate ownership and catalogue values

CREATE FUNCTION public.validate_tutor_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.accounts a
        WHERE a.id = NEW.tutor_id
          AND a.account_type = 'tutor'
    ) THEN
        RAISE EXCEPTION 'Only tutor accounts can own offers'
            USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.technical_sheets ts
        WHERE ts.id = NEW.technical_sheet_id
          AND ts.provider_id = NEW.tutor_id
          AND ts.provider_type = 'private_tutor'
    ) THEN
        RAISE EXCEPTION 'Tutor technical sheet is not accessible'
            USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM unnest(NEW.subject_codes) AS s(code)
        WHERE s.code IS NULL
           OR NOT EXISTS (
               SELECT 1 FROM public.tutor_subjects c
               WHERE c.code = s.code
           )
    ) THEN
        RAISE EXCEPTION 'Invalid tutor subject'
            USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM unnest(NEW.level_codes) AS l(code)
        WHERE l.code IS NULL
           OR NOT EXISTS (
               SELECT 1 FROM public.tutor_levels c
               WHERE c.code = l.code
           )
    ) THEN
        RAISE EXCEPTION 'Invalid tutor level'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER tutor_offers_validate
BEFORE INSERT OR UPDATE ON public.tutor_offers
FOR EACH ROW
EXECUTE FUNCTION public.validate_tutor_offer();


-- 4. Shared publication requirements
-- Reuses #87's publication_issues() for the technical
-- sheet and structured address. Subjects/academic levels
-- replace the activity-specific languages requirement.

CREATE FUNCTION public.tutor_offer_missing_fields(
    p_offer public.tutor_offers
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_address_id uuid;
    v_issues text[] := '{}';
BEGIN
    SELECT ts.address_id
    INTO v_address_id
    FROM public.technical_sheets ts
    WHERE ts.id = p_offer.technical_sheet_id
      AND ts.provider_id = p_offer.tutor_id
      AND ts.provider_type = 'private_tutor'
      AND btrim(ts.name) <> ''
      AND (
          ts.email IS NOT NULL
          OR ts.phone_number IS NOT NULL
      );

    -- Validate the chosen tutor sheet, not another
    -- unrelated sheet belonging to the same account.
    IF v_address_id IS NULL THEN
        v_issues := array_append(
            v_issues, 'technical_sheet'
        );
    ELSE
        v_issues := v_issues ||
            public.publication_issues(
                NULL::uuid,
                p_offer.tutor_id,
                v_address_id,
                'tutoring',
                'event',
                NULL::date,
                NULL::date,
                false
            );
    END IF;

    IF NULLIF(btrim(p_offer.title), '') IS NULL THEN
        v_issues := array_append(v_issues, 'title');
    END IF;

    IF cardinality(p_offer.subject_codes) = 0 THEN
        v_issues := array_append(v_issues, 'subjects');
    END IF;

    IF cardinality(p_offer.level_codes) = 0 THEN
        v_issues := array_append(v_issues, 'levels');
    END IF;

    IF p_offer.price_per_hour IS NULL THEN
        v_issues := array_append(v_issues, 'price');
    END IF;

    RETURN ARRAY(
        SELECT DISTINCT issue
        FROM unnest(v_issues) AS x(issue)
        ORDER BY issue
    );
END;
$$;


-- 5. Reject publishing incomplete offers

CREATE FUNCTION public.require_tutor_offer_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_issues text[];
BEGIN
    IF NEW.status = 'published' THEN
        v_issues :=
            public.tutor_offer_missing_fields(NEW);

        IF cardinality(v_issues) > 0 THEN
            RAISE EXCEPTION
                'Cannot publish incomplete tutor offer'
                USING ERRCODE = '23514',
                DETAIL =
                    'Missing: ' ||
                    array_to_string(v_issues, ', ');
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER tutor_offers_require_publication
BEFORE INSERT OR UPDATE ON public.tutor_offers
FOR EACH ROW
EXECUTE FUNCTION public.require_tutor_offer_publication();


-- 6. Endpoint: list missing publication fields.
-- Returns NULL when the caller is not the owner.

CREATE FUNCTION public.tutor_offer_publication_issues(
    p_offer_id uuid
)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT public.tutor_offer_missing_fields(o)
    FROM public.tutor_offers o
    WHERE o.id = p_offer_id
      AND o.tutor_id = (SELECT auth.uid());
$$;


-- 7. Row-level security

ALTER TABLE public.tutor_offers ENABLE ROW LEVEL SECURITY;

-- Owners can see their drafts.
-- Other authenticated users see published offers only.
CREATE POLICY "Owner or published tutor offers"
ON public.tutor_offers
FOR SELECT TO authenticated
USING (
    tutor_id = (SELECT auth.uid())
    OR status = 'published'
);

CREATE POLICY "Tutors create own offers"
ON public.tutor_offers
FOR INSERT TO authenticated
WITH CHECK (
    tutor_id = (SELECT auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.accounts a
        WHERE a.id = (SELECT auth.uid())
          AND a.account_type = 'tutor'
    )
);

CREATE POLICY "Tutors update own offers"
ON public.tutor_offers
FOR UPDATE TO authenticated
USING (tutor_id = (SELECT auth.uid()))
WITH CHECK (tutor_id = (SELECT auth.uid()));

CREATE POLICY "Tutors delete own offers"
ON public.tutor_offers
FOR DELETE TO authenticated
USING (tutor_id = (SELECT auth.uid()));


-- 8. Column privileges
-- The client cannot change owner, technical sheet,
-- category, ID, or creation timestamp after creation.

REVOKE ALL ON public.tutor_offers
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, DELETE
ON public.tutor_offers TO authenticated;

GRANT UPDATE (
    title,
    description,
    subject_codes,
    level_codes,
    price_per_hour,
    status
)
ON public.tutor_offers TO authenticated;

REVOKE ALL ON FUNCTION
public.validate_tutor_offer()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.tutor_offer_missing_fields(public.tutor_offers)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.require_tutor_offer_publication()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.tutor_offer_publication_issues(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.tutor_offer_publication_issues(uuid)
TO authenticated;
