-- #116: favourites of the logged-in customer.
-- The table, its unique key (customer_id, activity_id) and its RLS come from
-- C11: a customer only reads and deletes their own rows, and only saves
-- published activities.

-- The app inserts without sending its own id, like provider_profiles
ALTER TABLE public.favourites ALTER COLUMN customer_id SET DEFAULT auth.uid();

-- The favourites of the logged-in customer, newest first. Customers cannot read
-- activities that are no longer published, so this function returns what the
-- card needs (never the description or the schedule) and says whether the
-- activity can still be opened: published, not finished and with an approved
-- provider profile, like the catalog.
CREATE FUNCTION public.my_favourites(
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
    WHERE f.customer_id = auth.uid()
    ORDER BY f.created_at DESC, a.id
    LIMIT greatest(1, least(coalesce(p_limit, 20), 100))
    OFFSET greatest(0, coalesce(p_offset, 0));
$$;

REVOKE ALL ON FUNCTION public.my_favourites(integer, integer)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_favourites(integer, integer) TO authenticated;
