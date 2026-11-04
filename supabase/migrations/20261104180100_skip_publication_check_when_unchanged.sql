-- The app sends every field when it saves an activity, and UPDATE OF fires for
-- columns in the SET list even if their value does not change. Activities
-- published before the addresses were structured could therefore not be edited
-- at all ("A complete structured address is required to publish").
-- An activity that is already published is now checked again only when a field
-- that the publication rules depend on really changes.

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
