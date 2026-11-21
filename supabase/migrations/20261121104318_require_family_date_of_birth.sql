-- #151: the age of a family profile comes only from its date of birth.
-- C11 (#129) added date_of_birth but kept age_range for the old form. The form
-- now asks for the date, so age_range goes away and the date is required.
--
-- Team decision: profiles without a date of birth are deleted, not migrated.
-- An age range does not determine a date, and inventing one would be wrong
-- data about a minor. Their favourites go with them (ON DELETE CASCADE) and
-- their enrolment requests are deleted first, because that foreign key has no
-- cascade. The main profile is protected by a trigger, which is disabled only
-- for this cleanup: a family left without profiles creates a new one.

ALTER TABLE public.family_profiles DISABLE TRIGGER protect_main_family_profile_before_delete;

DELETE FROM public.enrolment_requests
WHERE family_profile_id IN (
    SELECT id FROM public.family_profiles WHERE date_of_birth IS NULL
);
DELETE FROM public.family_profiles WHERE date_of_birth IS NULL;

ALTER TABLE public.family_profiles ENABLE TRIGGER protect_main_family_profile_before_delete;

ALTER TABLE public.family_profiles ALTER COLUMN date_of_birth SET NOT NULL;

-- The provider function returned age_range as a fallback for profiles without
-- a date. Its result changes, so it is dropped and created again.
DROP FUNCTION public.provider_enrolment_requests(uuid, text, integer, integer);

-- Its CHECK constraint and its INSERT/UPDATE grants go with the column
ALTER TABLE public.family_profiles DROP COLUMN age_range;

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
        extract(year FROM age(current_date, fp.date_of_birth))::integer,
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

REVOKE ALL ON FUNCTION public.provider_enrolment_requests(uuid, text, integer, integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provider_enrolment_requests(uuid, text, integer, integer)
TO authenticated;
