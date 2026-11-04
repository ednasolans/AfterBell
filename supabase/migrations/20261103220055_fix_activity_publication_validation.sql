-- C11 / #128
-- Validate publication requirements when relevant activity fields change.

CREATE OR REPLACE FUNCTION public.require_publication_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Draft activities can be saved without meeting publication requirements.
    IF NEW.status <> 'published' THEN
        RETURN NEW;
    END IF;

    -- A complete technical sheet is required.
    IF NOT EXISTS (
        SELECT 1
        FROM public.technical_sheets ts
        WHERE ts.provider_id = NEW.provider_id
          AND btrim(ts.name) <> ''
          AND (
              ts.email IS NOT NULL
              OR ts.phone_number IS NOT NULL
          )
    ) THEN
        RAISE EXCEPTION
            'A complete technical sheet is required to publish'
            USING ERRCODE = '23514';
    END IF;

    -- The activity must use a valid, structured provider address.
    IF NOT EXISTS (
        SELECT 1
        FROM public.addresses ad
        WHERE ad.id = NEW.address_id
          AND ad.provider_id = NEW.provider_id
          AND NULLIF(btrim(ad.street), '') IS NOT NULL
          AND NULLIF(btrim(ad.number), '') IS NOT NULL
          AND NULLIF(btrim(ad.postal_code), '') IS NOT NULL
          AND NULLIF(btrim(ad.city), '') IS NOT NULL
          AND NULLIF(btrim(ad.province), '') IS NOT NULL
          AND NULLIF(btrim(ad.country), '') IS NOT NULL
    ) THEN
        RAISE EXCEPTION
            'A complete structured address is required to publish'
            USING ERRCODE = '23514';
    END IF;

    -- Temporary activities must have a valid date interval.
    IF NEW.type = 'temporary'
       AND (
           NEW.start_date IS NULL
           OR NEW.end_date IS NULL
           OR NEW.end_date < NEW.start_date
       ) THEN
        RAISE EXCEPTION
            'Temporary activities require valid start and end dates'
            USING ERRCODE = '23514';
    END IF;

    -- Language and tutor activities require language/level information.
    IF (NEW.category = 'language' OR NEW.is_tutor = true)
       AND NOT EXISTS (
           SELECT 1
           FROM public.languages l
           WHERE l.activity_id = NEW.id
       ) THEN
        RAISE EXCEPTION
            'Language or tutor activities require language and level'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activities_require_publication_fields
ON public.activities;

CREATE TRIGGER activities_require_publication_fields
BEFORE INSERT OR UPDATE OF
    status,
    category,
    type,
    start_date,
    end_date,
    address_id,
    is_tutor
ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.require_publication_fields();

-- Keep the pre-publication check consistent with the trigger.
CREATE OR REPLACE FUNCTION public.can_publish_activity(p_activity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.activities a
        JOIN public.categories c
            ON c.name = a.category
        JOIN public.addresses ad
            ON ad.id = a.address_id
           AND ad.provider_id = a.provider_id
        WHERE a.id = p_activity_id
          AND NULLIF(btrim(ad.street), '') IS NOT NULL
          AND NULLIF(btrim(ad.number), '') IS NOT NULL
          AND NULLIF(btrim(ad.postal_code), '') IS NOT NULL
          AND NULLIF(btrim(ad.city), '') IS NOT NULL
          AND NULLIF(btrim(ad.province), '') IS NOT NULL
          AND NULLIF(btrim(ad.country), '') IS NOT NULL
          AND EXISTS (
              SELECT 1
              FROM public.technical_sheets ts
              WHERE ts.provider_id = a.provider_id
                AND btrim(ts.name) <> ''
                AND (
                    ts.email IS NOT NULL
                    OR ts.phone_number IS NOT NULL
                )
          )
          AND (
              a.type <> 'temporary'
              OR (
                  a.start_date IS NOT NULL
                  AND a.end_date IS NOT NULL
                  AND a.end_date >= a.start_date
              )
          )
          AND (
              (a.category <> 'language' AND a.is_tutor = false)
              OR EXISTS (
                  SELECT 1
                  FROM public.languages l
                  WHERE l.activity_id = a.id
              )
          )
    );
$$;