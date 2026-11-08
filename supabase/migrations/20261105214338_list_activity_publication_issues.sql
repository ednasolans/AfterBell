-- #87: tell the provider everything that is missing before an activity can
-- be published, not only the first problem.
--
-- The publication rules were written twice (the trigger and
-- can_publish_activity) and could drift apart. They now live in one function,
-- publication_issues(), that returns one code per missing requirement:
--   technical_sheet  the provider has no complete technical sheet
--   address          the activity address is not a complete structured address
--   dates            a temporary activity has no valid start and end dates
--   language         a language or tutor activity has no language and level
-- The trigger, can_publish_activity() and the new activity_publication_issues()
-- (called by the app) all use it.


-- ============================================================
-- 1. THE RULES, IN ONE PLACE
-- Receives the values instead of an activity id, so the trigger can check
-- the new values before they are saved.
-- ============================================================

CREATE FUNCTION public.publication_issues(
    p_activity_id uuid,
    p_provider_id uuid,
    p_address_id uuid,
    p_category text,
    p_type text,
    p_start_date date,
    p_end_date date,
    p_is_tutor boolean
)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT array_remove(ARRAY[
        CASE WHEN NOT EXISTS (
            SELECT 1
            FROM public.technical_sheets ts
            WHERE ts.provider_id = p_provider_id
              AND btrim(ts.name) <> ''
              AND (ts.email IS NOT NULL OR ts.phone_number IS NOT NULL)
        ) THEN 'technical_sheet' END,

        CASE WHEN NOT EXISTS (
            SELECT 1
            FROM public.addresses ad
            WHERE ad.id = p_address_id
              AND ad.provider_id = p_provider_id
              AND NULLIF(btrim(ad.street), '') IS NOT NULL
              AND NULLIF(btrim(ad.number), '') IS NOT NULL
              AND NULLIF(btrim(ad.postal_code), '') IS NOT NULL
              AND NULLIF(btrim(ad.city), '') IS NOT NULL
              AND NULLIF(btrim(ad.province), '') IS NOT NULL
              AND NULLIF(btrim(ad.country), '') IS NOT NULL
        ) THEN 'address' END,

        CASE WHEN p_type = 'temporary'
              AND (p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date)
        THEN 'dates' END,

        CASE WHEN (p_category = 'language' OR p_is_tutor)
              AND NOT EXISTS (
                  SELECT 1 FROM public.languages l WHERE l.activity_id = p_activity_id
              )
        THEN 'language' END
    ], NULL);
$$;

REVOKE ALL ON FUNCTION public.publication_issues(uuid, uuid, uuid, text, text, date, date, boolean)
FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 2. FOR THE APP: what is missing to publish one of my activities
-- Returns NULL when the activity does not exist or is not the caller's,
-- so it never reveals anything about other providers.
-- ============================================================

CREATE FUNCTION public.activity_publication_issues(p_activity_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT public.publication_issues(
        a.id, a.provider_id, a.address_id, a.category,
        a.type, a.start_date, a.end_date, a.is_tutor
    )
    FROM public.activities a
    WHERE a.id = p_activity_id
      AND a.provider_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.activity_publication_issues(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.activity_publication_issues(uuid)
TO authenticated;


-- ============================================================
-- 3. can_publish_activity() uses the same rules
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_publish_activity(p_activity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COALESCE((
        SELECT cardinality(public.publication_issues(
            a.id, a.provider_id, a.address_id, a.category,
            a.type, a.start_date, a.end_date, a.is_tutor
        )) = 0
        FROM public.activities a
        WHERE a.id = p_activity_id
    ), false);
$$;


-- ============================================================
-- 4. The trigger uses the same rules
-- It keeps the previous messages (other tests and the app rely on them)
-- and lists every missing requirement in the DETAIL of the error.
-- ============================================================

CREATE OR REPLACE FUNCTION public.require_publication_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    issues text[];
BEGIN
    -- Draft activities can be saved without meeting publication requirements.
    IF NEW.status <> 'published' THEN
        RETURN NEW;
    END IF;

    -- An activity that is already published is checked again only when a
    -- field that the rules depend on really changes.
    IF TG_OP = 'UPDATE'
       AND OLD.status = 'published'
       AND NEW.category IS NOT DISTINCT FROM OLD.category
       AND NEW.type IS NOT DISTINCT FROM OLD.type
       AND NEW.start_date IS NOT DISTINCT FROM OLD.start_date
       AND NEW.end_date IS NOT DISTINCT FROM OLD.end_date
       AND NEW.address_id IS NOT DISTINCT FROM OLD.address_id
       AND NEW.is_tutor IS NOT DISTINCT FROM OLD.is_tutor THEN
        RETURN NEW;
    END IF;

    issues := public.publication_issues(
        NEW.id, NEW.provider_id, NEW.address_id, NEW.category,
        NEW.type, NEW.start_date, NEW.end_date, NEW.is_tutor
    );

    IF cardinality(issues) > 0 THEN
        RAISE EXCEPTION '%', CASE issues[1]
                WHEN 'technical_sheet' THEN 'A complete technical sheet is required to publish'
                WHEN 'address' THEN 'A complete structured address is required to publish'
                WHEN 'dates' THEN 'Temporary activities require valid start and end dates'
                ELSE 'Language or tutor activities require language and level'
            END
            USING ERRCODE = '23514',
                  DETAIL = 'Missing: ' || array_to_string(issues, ', ');
    END IF;

    RETURN NEW;
END;
$$;