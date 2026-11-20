-- #106: recommendations for the logged-in customer, calculated at the moment of
-- the request from structured data: the age of each family profile (from its
-- date of birth), its interests, and the town of the family. Decisions
-- documented in docs/features/recommendations.md.

-- The first version took one profile and a city chosen by the client. It had no
-- callers in the app, and its arguments change, so it is replaced.
DROP FUNCTION public.recommend_activities(uuid, text);

-- The age range of activities.target_age_ranges that contains an age in years.
-- It is the only place that maps years to ranges (same values as lib/ages.ts).
CREATE FUNCTION public.age_bracket(p_years integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT CASE
        WHEN p_years < 0 THEN NULL
        WHEN p_years <= 3 THEN '0-3'
        WHEN p_years <= 6 THEN '4-6'
        WHEN p_years <= 9 THEN '7-9'
        WHEN p_years <= 12 THEN '10-12'
        WHEN p_years <= 15 THEN '13-15'
        WHEN p_years <= 17 THEN '16-17'
        ELSE 'adult'
    END
$$;

-- One row per recommended activity, in this order:
--   1. more family profiles that fit it first,
--   2. closest to the family first (activities without a point go last),
--   3. newest first, then id so pages never repeat or skip rows.
--
-- An activity is recommended when it is published, its provider has an approved
-- profile (like the catalog), it has not finished, it takes place in the town
-- of the family, and it fits at least one profile of the family:
--   * age: its age ranges contain the age range of the profile, or 'all_publics';
--     the age is calculated now from date_of_birth, never stored;
--   * interests: its category is one of the interests of the profile.
-- A profile without date of birth or without interests fits nothing.
--
-- It returns the ids and why each one is suggested; the caller reads the
-- activity card data. SECURITY INVOKER: RLS applies, and the family is always
-- the one of the logged-in account, so nobody can ask for another family.
--
-- Errors (SQLSTATE 22023 unless said) tell the app which data is missing:
--   recommendations_not_a_customer (42501), recommendations_no_city,
--   recommendations_no_profiles, recommendations_incomplete_profiles.
CREATE FUNCTION public.recommend_activities(
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
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
    ORDER BY count(*) DESC, min(m.match_distance) ASC NULLS LAST, m.match_created_at DESC, m.match_activity
    LIMIT greatest(1, least(coalesce(p_limit, 20), 50))
    OFFSET greatest(0, coalesce(p_offset, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.age_bracket(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recommend_activities(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.age_bracket(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recommend_activities(integer, integer) TO authenticated;
