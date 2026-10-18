-- ============================================================
-- AfterBell - Issue #10
-- Initial accounts schema and authentication integration
-- ============================================================


-- ============================================================
-- 1. ACCOUNTS TABLE
-- ============================================================

CREATE TABLE public.accounts (

    id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    email TEXT NOT NULL,

    account_type TEXT NOT NULL
        DEFAULT 'customer'
        CHECK (
            account_type IN ('customer', 'company')
        ),

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW()

);


-- ============================================================
-- 2. AUTOMATIC ACCOUNT CREATION
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE

    new_account_type TEXT;

BEGIN

    -- Read account type from sign-up metadata.
    -- Use 'customer' when metadata is not provided.

    new_account_type :=
        COALESCE(
            NULLIF(
                NEW.raw_user_meta_data ->> 'account_type',
                ''
            ),
            'customer'
        );

    -- Reject unsupported account types.

    IF new_account_type NOT IN ('customer', 'company') THEN

        RAISE EXCEPTION
            'Invalid account_type: %',
            new_account_type;

    END IF;

    -- Create the application account.

    INSERT INTO public.accounts (
        id,
        email,
        account_type
    )
    VALUES (
        NEW.id,
        NEW.email,
        new_account_type
    );

    RETURN NEW;

END;
$$;


-- ============================================================
-- 3. AUTH TRIGGER
-- ============================================================

CREATE TRIGGER on_auth_user_created

AFTER INSERT ON auth.users

FOR EACH ROW

EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.accounts
ENABLE ROW LEVEL SECURITY;


-- Users can read only their own account.

CREATE POLICY "Users can read their own account"

ON public.accounts

FOR SELECT

TO authenticated

USING (
    (SELECT auth.uid()) = id
);


-- Users can update only their own account.

CREATE POLICY "Users can update their own account"

ON public.accounts

FOR UPDATE

TO authenticated

USING (
    (SELECT auth.uid()) = id
)

WITH CHECK (
    (SELECT auth.uid()) = id
);


-- ============================================================
-- 5. TABLE PRIVILEGES
-- ============================================================

-- Prevent application users from inserting or deleting
-- accounts directly.

REVOKE ALL
ON TABLE public.accounts
FROM PUBLIC, anon, authenticated;


-- Authenticated users may read accounts.
-- RLS restricts visible rows.

GRANT SELECT
ON TABLE public.accounts
TO authenticated;


-- Allow updating email only.
-- Account type, ID and creation date cannot be modified
-- directly by the mobile application.

GRANT UPDATE (email)
ON TABLE public.accounts
TO authenticated;


-- ============================================================
-- 6. SQL HELPER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_company()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (

        SELECT 1

        FROM public.accounts

        WHERE id = (SELECT auth.uid())

        AND account_type = 'company'

    );
$$;


-- ============================================================
-- 7. FUNCTION PERMISSIONS
-- ============================================================

REVOKE ALL
ON FUNCTION public.is_company()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_company()
TO authenticated;


-- The trigger function should not be callable directly
-- by application users.

REVOKE ALL
ON FUNCTION public.handle_new_user()
FROM PUBLIC, anon, authenticated;