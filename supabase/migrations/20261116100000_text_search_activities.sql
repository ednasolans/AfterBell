-- #101: text search of the published activities (and published tutor offers,
-- which are activities with is_tutor = true).
--
-- Fields searched (decision documented in docs/features/text-search.md):
--   title, description, category name and provider name.
-- Title, description and category are stored normalised (lower case, no
-- accents) in activities.search_normalized, so "musica" finds "Música".
-- The provider name changes in the technical sheet, not in the activity, so it
-- is read at query time from public_provider_contacts() (the only public view
-- of the technical sheet).

-- The category is part of the searchable text, so the trigger also fires when
-- it changes. The trigger function only changes its text.
CREATE OR REPLACE FUNCTION public.refresh_activity_search()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    NEW.search_normalized := lower(extensions.unaccent(
        coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '') || ' ' || coalesce(NEW.category, '')
    ));
    RETURN NEW;
END; $$;

DROP TRIGGER refresh_activity_search ON public.activities;
CREATE TRIGGER refresh_activity_search
    BEFORE INSERT OR UPDATE OF title, description, category ON public.activities
    FOR EACH ROW EXECUTE FUNCTION public.refresh_activity_search();

-- The backfill must not change updated_at: it is not an edit of the provider
ALTER TABLE public.activities DISABLE TRIGGER activities_touch_updated_at;
UPDATE public.activities SET search_normalized = lower(extensions.unaccent(
    coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, '')
));
ALTER TABLE public.activities ENABLE TRIGGER activities_touch_updated_at;

-- Indexes:
-- * activities_search_trgm_idx (already exists, GIN trigram on
--   search_normalized) serves every LIKE '%term%' of the search.
-- * This partial index serves the order of the results with the same
--   relevance (newest first) and only contains the rows the search can return.
CREATE INDEX activities_published_created_idx
    ON public.activities (created_at DESC, id) WHERE status = 'published';

-- Same arguments and result as before, so the Edge Function summarize-search
-- and the generated types keep working; the filters of #102 build on it.
--   * No text (NULL or blank): no text filter.
--   * 1 character or more than 100: error 'search_query_too_short' /
--     'search_query_too_long' (SQLSTATE 22023), so the app shows a clear message.
--   * Each word of the text must appear in some searched field (AND), in any order.
--   * LIKE wildcards typed by the user (% _ \) are escaped: they are plain text.
--   * Relevance: points per word (title 3, category 2, provider 2, description 1).
--     Ties: newest first.
--   * Only published activities. SECURITY INVOKER, so RLS also applies.
CREATE OR REPLACE FUNCTION public.search_activities(
    p_query text DEFAULT NULL, p_category text DEFAULT NULL,
    p_city text DEFAULT NULL, p_price_min numeric DEFAULT NULL,
    p_price_max numeric DEFAULT NULL, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0
)
RETURNS SETOF public.activities
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
    v_text text := lower(extensions.unaccent(btrim(coalesce(p_query, ''))));
    v_terms text[];
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
      AND (p_category IS NULL OR a.category = p_category)
      AND (p_city IS NULL OR lower(ad.city) = lower(p_city))
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
