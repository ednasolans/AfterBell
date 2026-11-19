-- Favourites belong to a family profile instead of the customer account: each
-- child has their own list, and the members of the family (both parents)
-- share it. Until now they belonged to the account (#116), so saving an
-- activity for one child saved it for every child.
--
-- The rows saved until now cannot be given to a profile reliably (they did not
-- say for whom they were saved) and are only test data, so they are deleted.
DELETE FROM public.favourites;

DROP POLICY "Owners read favourites" ON public.favourites;
DROP POLICY "Owners insert favourites" ON public.favourites;
DROP POLICY "Owners delete favourites" ON public.favourites;
DROP FUNCTION public.my_favourites(integer, integer);

ALTER TABLE public.favourites DROP CONSTRAINT favourites_pkey;
ALTER TABLE public.favourites DROP COLUMN customer_id;
-- A deleted profile takes its favourites with it
ALTER TABLE public.favourites
    ADD COLUMN family_profile_id uuid NOT NULL
        REFERENCES public.family_profiles(id) ON DELETE CASCADE;
-- Also serves the RLS lookups by profile (it is the first column)
ALTER TABLE public.favourites
    ADD PRIMARY KEY (family_profile_id, activity_id);

-- True when the profile belongs to the caller's family. SECURITY DEFINER like
-- is_family_member, so the policies do not depend on the RLS of family_profiles.
CREATE FUNCTION public.is_family_profile_member(p_family_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.family_profiles p
        WHERE p.id = p_family_profile_id
          AND public.is_family_member(p.family_group_id)
    );
$$;

REVOKE ALL ON FUNCTION public.is_family_profile_member(uuid)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_profile_member(uuid) TO authenticated;

-- The members of the family read, save and remove the favourites of its
-- profiles. Only published activities can be saved, as before.
CREATE POLICY "Family members read favourites" ON public.favourites
    FOR SELECT TO authenticated
    USING (public.is_family_profile_member(family_profile_id));
CREATE POLICY "Family members insert favourites" ON public.favourites
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_family_profile_member(family_profile_id)
        AND EXISTS (
            SELECT 1 FROM public.activities a
            WHERE a.id = activity_id AND a.status = 'published'
        )
    );
CREATE POLICY "Family members delete favourites" ON public.favourites
    FOR DELETE TO authenticated
    USING (public.is_family_profile_member(family_profile_id));

-- The favourites of one profile of the caller's family, newest first. Same
-- columns and availability rules as before (#116). SECURITY DEFINER skips RLS,
-- so it checks the family itself: another family's profile gives no rows.
CREATE FUNCTION public.my_favourites(
    p_family_profile_id uuid,
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    activity_id uuid,
    title text,
    category text,
    type text,
    start_date date,
    end_date date,
    target_age_ranges text[],
    price numeric,
    price_period text,
    provider_name text,
    available boolean,
    created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        a.id,
        a.title,
        a.category,
        a.type,
        a.start_date,
        a.end_date,
        a.target_age_ranges,
        a.price,
        a.price_period,
        -- The newest technical sheet, like public_provider_contacts
        (
            SELECT ts.name FROM public.technical_sheets ts
            WHERE ts.provider_id = a.provider_id
            ORDER BY ts.created_at DESC, ts.id DESC
            LIMIT 1
        ),
        a.status = 'published'
            AND (a.end_date IS NULL OR a.end_date >= current_date)
            AND EXISTS (
                SELECT 1 FROM public.provider_profiles p
                WHERE p.provider_id = a.provider_id
                  AND p.approved_headline IS NOT NULL
                  AND p.approved_description IS NOT NULL
            ),
        f.created_at
    FROM public.favourites f
    JOIN public.activities a ON a.id = f.activity_id
    WHERE f.family_profile_id = p_family_profile_id
      AND public.is_family_profile_member(p_family_profile_id)
    ORDER BY f.created_at DESC, a.id
    LIMIT greatest(1, least(coalesce(p_limit, 20), 100))
    OFFSET greatest(0, coalesce(p_offset, 0));
$$;

REVOKE ALL ON FUNCTION public.my_favourites(uuid, integer, integer)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_favourites(uuid, integer, integer)
    TO authenticated;
