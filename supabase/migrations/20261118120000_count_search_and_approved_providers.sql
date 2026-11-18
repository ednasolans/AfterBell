-- #103: the search screen shows how many activities were found, and the
-- search only returns activities of providers with an approved profile, like
-- the catalog list (fetchCatalogActivities). Decisions documented in
-- docs/features/text-search.md.
--
-- The validation, the filters and the relevance move to
-- search_activity_matches, shared by search_activities (one page) and the new
-- count_search_activities (the total), so both always agree.
-- search_activities keeps its arguments and return type: its callers (the app
-- and the summarize-search function) do not change.

-- Ids of the published activities that match the text and every filter, with
-- the relevance of each one. Same arguments and errors as search_activities.
-- It must be executable by the caller of search_activities (SECURITY INVOKER),
-- so it is granted to authenticated; it returns nothing that the search does
-- not already return.
CREATE FUNCTION public.search_activity_matches(
    p_query text, p_categories text[], p_city text, p_price_min numeric,
    p_price_max numeric, p_age_min integer, p_age_max integer,
    p_postal_code text, p_price_period text
)
RETURNS TABLE(activity_id uuid, relevance integer)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
    v_text text := lower(extensions.unaccent(btrim(coalesce(p_query, ''))));
    v_city text := nullif(lower(btrim(p_city)), '');
    v_postal_code text := nullif(btrim(p_postal_code), '');
    v_categories text[] := nullif(p_categories, '{}');
    v_terms text[];
    v_age_ranges text[];
BEGIN
    IF v_text <> '' THEN
        IF char_length(v_text) < 2 THEN
            RAISE EXCEPTION 'search_query_too_short' USING ERRCODE = '22023',
                HINT = 'Type at least 2 characters.';
        END IF;
        IF char_length(v_text) > 100 THEN
            RAISE EXCEPTION 'search_query_too_long' USING ERRCODE = '22023',
                HINT = 'Type at most 100 characters.';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM unnest(v_categories) AS requested(name)
        WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.name = requested.name)
    ) THEN
        RAISE EXCEPTION 'search_unknown_category' USING ERRCODE = '22023';
    END IF;

    IF p_age_min < 0 OR p_age_max < 0 THEN
        RAISE EXCEPTION 'search_negative_age' USING ERRCODE = '22023';
    END IF;
    IF p_age_min > p_age_max THEN
        RAISE EXCEPTION 'search_invalid_age_range' USING ERRCODE = '22023';
    END IF;

    IF p_price_min < 0 OR p_price_max < 0 THEN
        RAISE EXCEPTION 'search_negative_price' USING ERRCODE = '22023';
    END IF;
    IF p_price_min > p_price_max THEN
        RAISE EXCEPTION 'search_invalid_price_range' USING ERRCODE = '22023';
    END IF;
    IF p_price_period IS NOT NULL AND p_price_period NOT IN (
        'per_hour', 'per_day', 'per_week', 'per_month', 'per_term', 'per_year'
    ) THEN
        RAISE EXCEPTION 'search_unknown_price_period' USING ERRCODE = '22023';
    END IF;
    IF (p_price_min IS NOT NULL OR p_price_max IS NOT NULL) AND p_price_period IS NULL THEN
        RAISE EXCEPTION 'search_price_period_required' USING ERRCODE = '22023';
    END IF;

    -- The age ranges of activities.target_age_ranges that overlap the requested
    -- ages. Comparing arrays with && lets the GIN index serve the filter.
    IF p_age_min IS NOT NULL OR p_age_max IS NOT NULL THEN
        SELECT array_agg(r.age_range) || 'all_publics'::text
        INTO v_age_ranges
        FROM (VALUES ('0-3', 0, 3), ('4-6', 4, 6), ('7-9', 7, 9), ('10-12', 10, 12),
                     ('13-15', 13, 15), ('16-17', 16, 17), ('adult', 18, NULL))
             AS r(age_range, age_from, age_to)
        WHERE (p_age_max IS NULL OR r.age_from <= p_age_max)
          AND (p_age_min IS NULL OR r.age_to IS NULL OR r.age_to >= p_age_min);
    END IF;

    -- At most 5 words, each one escaped as a LIKE pattern
    SELECT coalesce(array_agg('%' || replace(replace(replace(t.w, '\', '\\'), '%', '\%'), '_', '\_') || '%'), '{}')
    INTO v_terms
    FROM (SELECT w FROM regexp_split_to_table(v_text, '\s+') AS w WHERE w <> '' LIMIT 5) t;

    RETURN QUERY
    SELECT a.id,
        (SELECT coalesce(sum(
            (CASE WHEN n.title_n LIKE term THEN 3 ELSE 0 END)
          + (CASE WHEN lower(extensions.unaccent(a.category)) LIKE term THEN 2 ELSE 0 END)
          + (CASE WHEN n.provider_n LIKE term THEN 2 ELSE 0 END)
          + (CASE WHEN lower(extensions.unaccent(coalesce(a.description, ''))) LIKE term THEN 1 ELSE 0 END)
        ), 0)::integer FROM unnest(v_terms) AS term)
    FROM public.activities a
    JOIN public.addresses ad ON ad.id = a.address_id
    -- Customers only see activities of providers with an approved profile
    JOIN public.public_approved_provider_profiles() pp ON pp.provider_id = a.provider_id
    LEFT JOIN public.public_provider_contacts() c ON c.provider_id = a.provider_id
    CROSS JOIN LATERAL (SELECT lower(extensions.unaccent(a.title)) AS title_n,
                               lower(extensions.unaccent(coalesce(c.name, ''))) AS provider_n) n
    WHERE a.status = 'published'
      AND NOT EXISTS (
          SELECT 1 FROM unnest(v_terms) AS term
          WHERE NOT (a.search_normalized LIKE term OR n.provider_n LIKE term)
      )
      AND (v_categories IS NULL OR a.category = ANY (v_categories))
      AND (v_age_ranges IS NULL OR a.target_age_ranges && v_age_ranges)
      AND (v_city IS NULL OR lower(ad.city) = v_city)
      AND (v_postal_code IS NULL OR ad.postal_code = v_postal_code)
      AND (p_price_period IS NULL OR a.price_period = p_price_period)
      AND (p_price_min IS NULL OR a.price >= p_price_min)
      AND (p_price_max IS NULL OR a.price <= p_price_max);
END; $$;

REVOKE ALL ON FUNCTION public.search_activity_matches(text, text[], text, numeric, numeric, integer, integer, text, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_activity_matches(text, text[], text, numeric, numeric, integer, integer, text, text)
    TO authenticated;

-- Same arguments, order and pagination as before (#101, #102)
CREATE OR REPLACE FUNCTION public.search_activities(
    p_query text DEFAULT NULL, p_categories text[] DEFAULT NULL,
    p_city text DEFAULT NULL, p_price_min numeric DEFAULT NULL,
    p_price_max numeric DEFAULT NULL, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0,
    p_age_min integer DEFAULT NULL, p_age_max integer DEFAULT NULL,
    p_postal_code text DEFAULT NULL, p_price_period text DEFAULT NULL
)
RETURNS SETOF public.activities
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
    SELECT a.*
    FROM public.search_activity_matches(
        p_query, p_categories, p_city, p_price_min, p_price_max,
        p_age_min, p_age_max, p_postal_code, p_price_period
    ) m
    JOIN public.activities a ON a.id = m.activity_id
    ORDER BY m.relevance DESC, a.created_at DESC, a.id
    LIMIT greatest(1, least(coalesce(p_limit, 20), 100))
    OFFSET greatest(0, coalesce(p_offset, 0));
$$;

-- How many activities search_activities finds with the same text and filters,
-- across every page
CREATE FUNCTION public.count_search_activities(
    p_query text DEFAULT NULL, p_categories text[] DEFAULT NULL,
    p_city text DEFAULT NULL, p_price_min numeric DEFAULT NULL,
    p_price_max numeric DEFAULT NULL,
    p_age_min integer DEFAULT NULL, p_age_max integer DEFAULT NULL,
    p_postal_code text DEFAULT NULL, p_price_period text DEFAULT NULL
)
RETURNS integer
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
    SELECT count(*)::integer
    FROM public.search_activity_matches(
        p_query, p_categories, p_city, p_price_min, p_price_max,
        p_age_min, p_age_max, p_postal_code, p_price_period
    );
$$;

REVOKE ALL ON FUNCTION public.count_search_activities(text, text[], text, numeric, numeric, integer, integer, text, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_search_activities(text, text[], text, numeric, numeric, integer, integer, text, text)
    TO authenticated;
