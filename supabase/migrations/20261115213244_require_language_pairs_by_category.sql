-- C5.1: require a language/level pair only for language activities.
-- Keep the existing signature and grants for callers of the shared rules.
CREATE OR REPLACE FUNCTION public.publication_issues(
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

        CASE WHEN p_category = 'language'
              AND NOT EXISTS (
                  SELECT 1 FROM public.languages l WHERE l.activity_id = p_activity_id
              )
        THEN 'language' END
    ], NULL);
$$;
