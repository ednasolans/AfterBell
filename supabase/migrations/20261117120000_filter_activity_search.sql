-- #102: filters of the activity search (category, age range, city and price),
-- alone or together with the text search of #101, and the values available to
-- build them. Decisions documented in docs/features/text-search.md.

-- The category filter now takes several categories, so the argument type
-- changes and the function must be dropped (CREATE OR REPLACE cannot change it).
-- The first arguments keep their position, so positional calls that pass NULL
-- as the category keep working; the new filters are added at the end.
DROP FUNCTION public.search_activities(text, text, text, numeric, numeric, integer, integer);

-- Every filter is optional (NULL: not applied) and they are combined with AND,
-- also with the text when there is one.
--   * p_categories: names of the category catalogue (activities.category is a
--     foreign key to categories.name, and the names cannot change). Empty: no filter.
--   * p_age_min / p_age_max: requested ages in years. An activity matches when
--     one of its age ranges overlaps them; 'all_publics' always matches.
--   * p_city (without case) and p_postal_code: structured address fields. Blank: no filter.
--   * p_price_min / p_price_max: compared only with activities of the same
--     p_price_period, which is required with them: 20 per hour and 20 per year
--     are not the same price.
-- Invalid values raise an error with SQLSTATE 22023 and a code as the message.
CREATE FUNCTION public.search_activities(
    p_query text DEFAULT NULL, p_categories text[] DEFAULT NULL,
    p_city text DEFAULT NULL, p_price_min numeric DEFAULT NULL,
    p_price_max numeric DEFAULT NULL, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0,
    p_age_min integer DEFAULT NULL, p_age_max integer DEFAULT NULL,
    p_postal_code text DEFAULT NULL, p_price_period text DEFAULT NULL
)
RETURNS SETOF public.activities
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
    -- ages. Comparing arrays with && lets the GIN index below serve the filter.
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
    SELECT a.*
    FROM public.activities a
    JOIN public.addresses ad ON ad.id = a.address_id
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
      AND (p_price_max IS NULL OR a.price <= p_price_max)
    ORDER BY
        (SELECT coalesce(sum(
            (CASE WHEN n.title_n LIKE term THEN 3 ELSE 0 END)
          + (CASE WHEN lower(extensions.unaccent(a.category)) LIKE term THEN 2 ELSE 0 END)
          + (CASE WHEN n.provider_n LIKE term THEN 2 ELSE 0 END)
          + (CASE WHEN lower(extensions.unaccent(coalesce(a.description, ''))) LIKE term THEN 1 ELSE 0 END)
        ), 0) FROM unnest(v_terms) AS term) DESC,
        a.created_at DESC, a.id
    LIMIT greatest(1, least(coalesce(p_limit, 20), 100))
    OFFSET greatest(0, coalesce(p_offset, 0));
END; $$;

REVOKE ALL ON FUNCTION public.search_activities(text, text[], text, numeric, numeric, integer, integer, integer, integer, text, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_activities(text, text[], text, numeric, numeric, integer, integer, integer, integer, text, text)
    TO authenticated;

-- The values to build the filters:
--   * categories: the whole catalogue, by name.
--   * cities: the cities of published activities, once each whatever their
--     case ("Lleida" and "lleida" are the same city for the filter).
--   * prices: the lowest and highest price of each price period, because
--     prices of different periods are not compared.
-- Same name and return type as before (it had no callers), so the grants stay.
CREATE OR REPLACE FUNCTION public.available_activity_filters()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT jsonb_build_object(
  'categories', coalesce((SELECT jsonb_agg(c.name ORDER BY c.name) FROM public.categories c), '[]'::jsonb),
  'cities', coalesce((SELECT jsonb_agg(x.city ORDER BY x.city) FROM (
      SELECT DISTINCT ON (lower(ad.city)) ad.city
      FROM public.activities a JOIN public.addresses ad ON ad.id = a.address_id
      WHERE a.status = 'published' AND ad.city IS NOT NULL
      ORDER BY lower(ad.city), ad.city
  ) x), '[]'::jsonb),
  'prices', coalesce((SELECT jsonb_agg(
      jsonb_build_object('period', p.price_period, 'min', p.min_price, 'max', p.max_price)
      ORDER BY array_position(
          ARRAY['per_hour', 'per_day', 'per_week', 'per_month', 'per_term', 'per_year'], p.price_period)
  ) FROM (
      SELECT price_period, min(price) AS min_price, max(price) AS max_price
      FROM public.activities WHERE status = 'published' GROUP BY price_period
  ) p), '[]'::jsonb)
 );
$$;

-- Indexes of the new filters (the category already has activities_category_idx
-- and the postal code addresses_postal_code_idx):
--   * age ranges: the search compares arrays with &&, which a GIN index serves.
--   * city: the search compares lower(city), which the plain index on city cannot serve.
--   * price: always filtered together with its period, only on published rows.
CREATE INDEX activities_target_age_ranges_idx ON public.activities USING gin (target_age_ranges);
CREATE INDEX addresses_city_lower_idx ON public.addresses (lower(city));
CREATE INDEX activities_published_period_price_idx
    ON public.activities (price_period, price) WHERE status = 'published';
