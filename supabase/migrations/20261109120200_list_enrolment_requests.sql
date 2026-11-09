-- #117: lists of enrolment requests.
-- Customers cannot read activities that are no longer published, and providers
-- cannot read family profiles, so the lists are functions that return only
-- what each side needs. Both are SECURITY DEFINER and filter by auth.uid().

-- The requests of the logged-in customer, newest first. The activity title is
-- returned even if the activity is no longer available, so the list can say so.
CREATE FUNCTION public.my_enrolment_requests(
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    activity_id uuid,
    activity_title text,
    activity_available boolean,
    family_profile_id uuid,
    family_profile_name text,
    message text,
    status text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        er.id,
        er.activity_id,
        a.title,
        a.status = 'published' AND (a.end_date IS NULL OR a.end_date >= current_date),
        er.family_profile_id,
        fp.first_name,
        er.message,
        er.status,
        er.created_at,
        er.updated_at
    FROM public.enrolment_requests er
    JOIN public.activities a ON a.id = er.activity_id
    JOIN public.family_profiles fp ON fp.id = er.family_profile_id
    WHERE er.customer_id = auth.uid()
    ORDER BY er.created_at DESC, er.id
    LIMIT greatest(1, least(coalesce(p_limit, 20), 100))
    OFFSET greatest(0, coalesce(p_offset, 0));
$$;

-- The requests for the activities of the logged-in provider, pending first.
-- Only what the provider needs: the first name and age of the profile, and the
-- email of the family so the provider can contact them (team decision).
CREATE FUNCTION public.provider_enrolment_requests(
    p_activity_id uuid DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    activity_id uuid,
    activity_title text,
    family_profile_name text,
    family_profile_age integer,
    family_profile_age_range text,
    customer_email text,
    message text,
    status text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        er.id,
        er.activity_id,
        a.title,
        fp.first_name,
        CASE WHEN fp.date_of_birth IS NULL THEN NULL
             ELSE extract(year FROM age(current_date, fp.date_of_birth))::integer END,
        fp.age_range,
        ac.email,
        er.message,
        er.status,
        er.created_at,
        er.updated_at
    FROM public.enrolment_requests er
    JOIN public.activities a ON a.id = er.activity_id
    JOIN public.family_profiles fp ON fp.id = er.family_profile_id
    JOIN public.accounts ac ON ac.id = er.customer_id
    WHERE a.provider_id = auth.uid()
      AND (p_activity_id IS NULL OR er.activity_id = p_activity_id)
      AND (p_status IS NULL OR er.status = p_status)
    ORDER BY er.status = 'pending' DESC, er.created_at DESC, er.id
    LIMIT greatest(1, least(coalesce(p_limit, 20), 100))
    OFFSET greatest(0, coalesce(p_offset, 0));
$$;

REVOKE ALL ON FUNCTION public.my_enrolment_requests(integer, integer)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provider_enrolment_requests(uuid, text, integer, integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_enrolment_requests(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_enrolment_requests(uuid, text, integer, integer)
TO authenticated;
