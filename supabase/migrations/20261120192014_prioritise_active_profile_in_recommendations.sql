-- #108: the profile the customer is exploring for comes first among the
-- activities that fit the same number of profiles. The order is still decided
-- in the database, because the list is paginated: reordering each page in the
-- app would mix pages.
--
-- Order: more profiles that fit it; then the ones that fit p_profile_id; then
-- the closest; then the newest (and the id, so pages never repeat or skip rows).
--
-- p_profile_id is optional (NULL keeps the previous order). It only compares
-- with the profiles of the caller's family, so the id of another family's
-- profile changes nothing and reveals nothing.
--
-- A new argument changes the signature: the old function is dropped, so there
-- are never two versions with different orders.
DROP FUNCTION public.recommend_activities(integer, integer);

CREATE FUNCTION public.recommend_activities(
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0,
    p_profile_id uuid DEFAULT NULL
)
RETURNS TABLE (
    activity_id uuid,
    matched_profiles jsonb,
    matched_count integer,
    distance_meters double precision
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_group uuid;
    v_city text;
    v_location extensions.geography;
BEGIN
    SELECT m.family_group_id INTO v_group
    FROM public.family_group_members m
    WHERE m.account_id = auth.uid();
    IF v_group IS NULL THEN
        RAISE EXCEPTION 'recommendations_not_a_customer' USING ERRCODE = '42501';
    END IF;

    SELECT nullif(lower(btrim(g.city)), ''), g.location INTO v_city, v_location
    FROM public.family_groups g
    WHERE g.id = v_group;
    IF v_city IS NULL THEN
        RAISE EXCEPTION 'recommendations_no_city' USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.family_profiles fp WHERE fp.family_group_id = v_group) THEN
        RAISE EXCEPTION 'recommendations_no_profiles' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.family_profiles fp
        WHERE fp.family_group_id = v_group
          AND fp.date_of_birth IS NOT NULL AND cardinality(fp.interests) > 0
    ) THEN
        RAISE EXCEPTION 'recommendations_incomplete_profiles' USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    WITH profiles AS (
        SELECT fp.id AS profile_id, fp.first_name, fp.interests,
               ARRAY[public.age_bracket(extract(year FROM age(current_date, fp.date_of_birth))::integer),
                     'all_publics'] AS age_ranges
        FROM public.family_profiles fp
        WHERE fp.family_group_id = v_group
          AND fp.date_of_birth IS NOT NULL AND cardinality(fp.interests) > 0
    ),
    matches AS (
        SELECT a.id AS match_activity, a.created_at AS match_created_at,
               p.profile_id AS match_profile, p.first_name AS match_name,
               extensions.ST_Distance(ad.location, v_location) AS match_distance
        FROM public.activities a
        JOIN public.addresses ad ON ad.id = a.address_id
        JOIN profiles p ON a.category = ANY (p.interests) AND a.target_age_ranges && p.age_ranges
        WHERE a.status = 'published'
          AND (a.end_date IS NULL OR a.end_date >= current_date)
          AND lower(ad.city) = v_city
          AND a.provider_id IN (SELECT pp.provider_id FROM public.public_approved_provider_profiles() pp)
    )
    SELECT m.match_activity,
           jsonb_agg(jsonb_build_object('id', m.match_profile, 'first_name', m.match_name)
                     ORDER BY m.match_name, m.match_profile),
           count(*)::integer,
           min(m.match_distance)
    FROM matches m
    GROUP BY m.match_activity, m.match_created_at
    ORDER BY count(*) DESC,
             coalesce(bool_or(m.match_profile = p_profile_id), false) DESC,
             min(m.match_distance) ASC NULLS LAST, m.match_created_at DESC, m.match_activity
    LIMIT greatest(1, least(coalesce(p_limit, 20), 50))
    OFFSET greatest(0, coalesce(p_offset, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.recommend_activities(integer, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recommend_activities(integer, integer, uuid) TO authenticated;
