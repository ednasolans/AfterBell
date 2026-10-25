
-- ============================================================
-- AfterBell - Issue #18
-- Family groups, membership and profiles
-- ============================================================

-- Each customer belongs to one family group.
-- Family profiles belong to the group rather than
-- directly to an account, allowing future shared parenting.

-- ============================================================
-- 1. FAMILY GROUPS
-- ============================================================

CREATE TABLE public.family_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 2. FAMILY GROUP MEMBERS
-- ============================================================

CREATE TABLE public.family_group_members (
    account_id UUID PRIMARY KEY
        REFERENCES public.accounts(id)
        ON DELETE CASCADE,

    family_group_id UUID NOT NULL
        REFERENCES public.family_groups(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Membership lookups by family group.
CREATE INDEX family_group_members_family_group_id_idx
ON public.family_group_members(family_group_id);


-- ============================================================
-- 3. FAMILY PROFILES
-- ============================================================

-- Store the minimum information needed about minors.
-- No birth dates, photos or full names.

CREATE TABLE public.family_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    family_group_id UUID NOT NULL
        REFERENCES public.family_groups(id)
        ON DELETE CASCADE,

    first_name TEXT NOT NULL,

    age_range TEXT NOT NULL,

    interests TEXT[] NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT family_profiles_first_name_valid
        CHECK (
            btrim(first_name) <> ''
            AND char_length(first_name) <= 50
        ),

    -- Same values as mobile/src/lib/ages.ts.
    CONSTRAINT family_profiles_age_range_valid
        CHECK (
            age_range IN (
                '0-3',
                '4-6',
                '7-9',
                '10-12',
                '13-15',
                '16-17',
                'adult'
            )
        ),

    -- Same values as mobile/src/lib/activityCategories.ts.
    CONSTRAINT family_profiles_interests_valid
        CHECK (
            array_position(interests, NULL) IS NULL
            AND interests <@ ARRAY[
                'football',
                'basketball',
                'tennis',
                'swimming',
                'dance',
                'drama',
                'music',
                'language',
                'art',
                'tutoring',
                'other'
            ]::TEXT[]
        )
);

CREATE INDEX family_profiles_family_group_id_idx
ON public.family_profiles(family_group_id);


-- ============================================================
-- 4. AUTOMATIC FAMILY GROUP CREATION
-- ============================================================

CREATE FUNCTION public.create_customer_family_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    new_group_id UUID;
BEGIN
    -- Company accounts do not belong to family groups.
    IF NEW.account_type <> 'customer' THEN
        RETURN NEW;
    END IF;

    -- Create the family group.
    INSERT INTO public.family_groups
    DEFAULT VALUES
    RETURNING id INTO new_group_id;

    -- Associate the newly created customer with the group.
    INSERT INTO public.family_group_members (
        account_id,
        family_group_id
    )
    VALUES (
        NEW.id,
        new_group_id
    );

    RETURN NEW;
END;
$$;

-- Create a family group whenever a new customer account
-- is inserted into public.accounts.
CREATE TRIGGER on_customer_account_created
AFTER INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.create_customer_family_group();

-- Prevent direct execution by application users.
REVOKE ALL
ON FUNCTION public.create_customer_family_group()
FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 5. BACKFILL EXISTING CUSTOMER ACCOUNTS
-- ============================================================

DO $$
DECLARE
    customer_record RECORD;
    new_group_id UUID;
BEGIN
    FOR customer_record IN
        SELECT a.id
        FROM public.accounts a
        WHERE a.account_type = 'customer'
          AND NOT EXISTS (
              SELECT 1
              FROM public.family_group_members m
              WHERE m.account_id = a.id
          )
    LOOP
        INSERT INTO public.family_groups
        DEFAULT VALUES
        RETURNING id INTO new_group_id;

        INSERT INTO public.family_group_members (
            account_id,
            family_group_id
        )
        VALUES (
            customer_record.id,
            new_group_id
        );
    END LOOP;
END;
$$;


-- ============================================================
-- 6. FAMILY MEMBERSHIP SECURITY HELPER
-- ============================================================

CREATE FUNCTION public.is_family_member(
    group_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.family_group_members m
        JOIN public.accounts a
          ON a.id = m.account_id
        WHERE m.family_group_id = group_id
          AND m.account_id = (SELECT auth.uid())
          AND a.account_type = 'customer'
    );
$$;

REVOKE ALL
ON FUNCTION public.is_family_member(UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.is_family_member(UUID)
TO authenticated;


-- ============================================================
-- 7. TABLE PRIVILEGES
-- ============================================================

-- Family groups are created internally.
REVOKE ALL
ON TABLE public.family_groups
FROM PUBLIC, anon, authenticated;

GRANT SELECT
ON TABLE public.family_groups
TO authenticated;

-- Memberships are managed by database triggers.
REVOKE ALL
ON TABLE public.family_group_members
FROM PUBLIC, anon, authenticated;

GRANT SELECT
ON TABLE public.family_group_members
TO authenticated;

-- Family profiles can be managed by customers,
-- subject to row-level security.
REVOKE ALL
ON TABLE public.family_profiles
FROM PUBLIC, anon, authenticated;

GRANT SELECT, DELETE
ON TABLE public.family_profiles

TO authenticated;

-- The client can insert only editable profile fields.
GRANT INSERT (
    family_group_id,
    first_name,
    age_range,
    interests
)
ON TABLE public.family_profiles
TO authenticated;

-- The owning group and immutable fields cannot change.
GRANT UPDATE (
    first_name,
    age_range,
    interests
)
ON TABLE public.family_profiles
TO authenticated;


-- ============================================================
-- 8. ENABLE ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE public.family_groups
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.family_group_members
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.family_profiles
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 9. FAMILY GROUPS RLS
-- ============================================================

CREATE POLICY "Members read their family group"
ON public.family_groups
FOR SELECT
TO authenticated
USING (
    (SELECT public.is_family_member(id))
);


-- ============================================================
-- 10. FAMILY GROUP MEMBERS RLS
-- ============================================================

CREATE POLICY "Members read family memberships"
ON public.family_group_members
FOR SELECT
TO authenticated
USING (
    (SELECT public.is_family_member(family_group_id))
);


-- ============================================================
-- 11. FAMILY PROFILES RLS
-- ============================================================

-- SELECT: customers can see profiles of their family group.

CREATE POLICY "Members read family profiles"
ON public.family_profiles
FOR SELECT
TO authenticated
USING (
    (SELECT public.is_family_member(family_group_id))
);

-- INSERT: customers may create profiles only in their
-- own family group.

CREATE POLICY "Members create family profiles"
ON public.family_profiles
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT public.is_family_member(family_group_id))
);

-- UPDATE: customers may edit profiles only in their
-- own family group.

CREATE POLICY "Members update family profiles"
ON public.family_profiles
FOR UPDATE
TO authenticated
USING (
    (SELECT public.is_family_member(family_group_id))
)
WITH CHECK (
    (SELECT public.is_family_member(family_group_id))
);

-- DELETE: customers may delete profiles only from
-- their own family group.

CREATE POLICY "Members delete family profiles"
ON public.family_profiles
FOR DELETE
TO authenticated
USING (
    (SELECT public.is_family_member(family_group_id))
);
