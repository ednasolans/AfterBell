
-- #96 - Individual tutor registration.
-- Reuse accounts, technical_sheets and addresses.

-- =========================================================
-- 1. Allow tutor accounts
-- =========================================================

ALTER TABLE public.accounts
    DROP CONSTRAINT accounts_account_type_check;

ALTER TABLE public.accounts
    ADD CONSTRAINT accounts_account_type_check
    CHECK (account_type IN ('customer', 'company', 'tutor'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    new_account_type text;
BEGIN
    new_account_type := COALESCE(
        NULLIF(NEW.raw_user_meta_data ->> 'account_type', ''),
        'customer'
    );

    IF new_account_type NOT IN ('customer', 'company', 'tutor') THEN
        RAISE EXCEPTION 'Invalid account type'
            USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.accounts (id, email, account_type)
    VALUES (NEW.id, NEW.email, new_account_type);

    RETURN NEW;
END;
$$;

-- The existing on_auth_user_created trigger uses this function.

-- =========================================================
-- 2. Extend the existing technical sheets
-- =========================================================

ALTER TABLE public.technical_sheets
    ADD COLUMN first_name text,
    ADD COLUMN last_name text;

ALTER TABLE public.technical_sheets
    ADD CONSTRAINT technical_sheets_first_name_length
        CHECK (char_length(first_name) <= 50),
    ADD CONSTRAINT technical_sheets_last_name_length
        CHECK (char_length(last_name) <= 50);

GRANT UPDATE (first_name, last_name)
ON public.technical_sheets TO authenticated;

-- =========================================================
-- 3. Validate individual tutor technical sheets
-- =========================================================

CREATE FUNCTION public.validate_tutor_technical_sheet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    owner_type text;
BEGIN
    SELECT account_type INTO owner_type
    FROM public.accounts
    WHERE id = NEW.provider_id;

    IF owner_type <> 'tutor' THEN
        RETURN NEW;
    END IF;

    NEW.first_name := NULLIF(btrim(NEW.first_name), '');
    NEW.last_name := NULLIF(btrim(NEW.last_name), '');
    NEW.description := NULLIF(btrim(NEW.description), '');

    IF NEW.first_name IS NULL THEN
        RAISE EXCEPTION 'First name is required'
            USING ERRCODE = '23514';
    END IF;

    IF char_length(NEW.first_name) > 50 THEN
        RAISE EXCEPTION 'First name must be at most 50 characters'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.last_name IS NULL THEN
        RAISE EXCEPTION 'Last name is required'
            USING ERRCODE = '23514';
    END IF;

    IF char_length(NEW.last_name) > 50 THEN
        RAISE EXCEPTION 'Last name must be at most 50 characters'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.description IS NULL THEN
        RAISE EXCEPTION 'Presentation is required'
            USING ERRCODE = '23514';
    END IF;

    IF char_length(NEW.description) > 500 THEN
        RAISE EXCEPTION 'Presentation must be at most 500 characters'
            USING ERRCODE = '23514';
    END IF;

    -- Tutors use the private tutor provider type.
    -- Name is derived from the personal fields.
    NEW.provider_type := 'private_tutor';
    NEW.name := NEW.first_name || ' ' || NEW.last_name;

    -- Subjects and levels belong to #97.
    NEW.activity_types := ARRAY['tutoring']::text[];

    RETURN NEW;
END;
$$;

CREATE TRIGGER validate_tutor_technical_sheet_before_write
BEFORE INSERT OR UPDATE ON public.technical_sheets
FOR EACH ROW
EXECUTE FUNCTION public.validate_tutor_technical_sheet();

REVOKE ALL
ON FUNCTION public.validate_tutor_technical_sheet()
FROM PUBLIC, anon, authenticated;

-- =========================================================
-- 4. Validate the structured address
-- =========================================================

CREATE FUNCTION public.validate_tutor_address()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    owner_type text;
BEGIN
    SELECT account_type INTO owner_type
    FROM public.accounts
    WHERE id = NEW.provider_id;

    IF owner_type <> 'tutor' THEN
        RETURN NEW;
    END IF;

    NEW.street := NULLIF(btrim(NEW.street), '');
    NEW.number := NULLIF(btrim(NEW.number), '');
    NEW.city := NULLIF(btrim(NEW.city), '');
    NEW.postal_code := NULLIF(btrim(NEW.postal_code), '');
    NEW.province := NULLIF(btrim(NEW.province), '');
    NEW.country := NULLIF(btrim(NEW.country), '');

    IF NEW.street IS NULL THEN
        RAISE EXCEPTION 'Street is required'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.number IS NULL THEN
        RAISE EXCEPTION 'Number is required'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.city IS NULL THEN
        RAISE EXCEPTION 'City is required'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.postal_code IS NULL THEN
        RAISE EXCEPTION 'Postal code is required'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.postal_code !~
        '^(0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$' THEN
        RAISE EXCEPTION 'Enter a valid Spanish postal code'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.province IS NULL THEN
        RAISE EXCEPTION 'Province is required'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.country IS DISTINCT FROM 'Spain' THEN
        RAISE EXCEPTION 'Country must be Spain'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER validate_tutor_address_before_write
BEFORE INSERT OR UPDATE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION public.validate_tutor_address();

REVOKE ALL
ON FUNCTION public.validate_tutor_address()
FROM PUBLIC, anon, authenticated;

-- Existing address constraints also validate field lengths.

-- =========================================================
-- 5. Automatically create the tutor's data at sign-up
-- =========================================================

CREATE FUNCTION public.create_tutor_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    metadata jsonb;
    new_address_id uuid;
BEGIN
    IF NEW.account_type <> 'tutor' THEN
        RETURN NEW;
    END IF;

    SELECT raw_user_meta_data INTO metadata
    FROM auth.users
    WHERE id = NEW.id;

    -- First, create the structured address.
    INSERT INTO public.addresses (
        provider_id,
        street,
        number,
        floor,
        door,
        postal_code,
        city,
        province,
        country
    )
    VALUES (
        NEW.id,
        metadata ->> 'street',
        metadata ->> 'number',
        NULLIF(btrim(metadata ->> 'floor'), ''),
        NULLIF(btrim(metadata ->> 'door'), ''),
        metadata ->> 'postal_code',
        metadata ->> 'city',
        metadata ->> 'province',
        metadata ->> 'country'
    )
    RETURNING id INTO new_address_id;

    -- Then create the private tutor technical sheet.
    INSERT INTO public.technical_sheets (
        provider_id,
        name,
        first_name,
        last_name,
        provider_type,
        description,
        address_id,
        email,
        activity_types
    )
    VALUES (
        NEW.id,
        'Private tutor',
        metadata ->> 'first_name',
        metadata ->> 'last_name',
        'private_tutor',
        metadata ->> 'presentation',
        new_address_id,
        NEW.email,
        ARRAY['tutoring']::text[]
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_tutor_account_created
AFTER INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.create_tutor_registration();

REVOKE ALL
ON FUNCTION public.create_tutor_registration()
FROM PUBLIC, anon, authenticated;

-- =========================================================
-- 6. Security: the existing update policies already use
-- provider_id = auth.uid().
-- We must also protect tutor address privacy.
-- =========================================================

-- Company addresses keep their existing visibility.
-- Tutor addresses are private to their owner.
CREATE FUNCTION public.is_company_account(p_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.accounts
        WHERE id = p_account_id
          AND account_type = 'company'
    );
$$;

REVOKE ALL
ON FUNCTION public.is_company_account(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.is_company_account(uuid)
TO authenticated;

DROP POLICY "Logged-in users can read addresses"
ON public.addresses;

CREATE POLICY "Read company addresses or own addresses"
ON public.addresses
FOR SELECT TO authenticated
USING (
    provider_id = (SELECT auth.uid())
    OR public.is_company_account(provider_id)
);



-- =========================================================
-- 7. Update the tutor profile atomically
-- =========================================================

CREATE FUNCTION public.update_my_tutor_profile(
    p_first_name text,
    p_last_name text,
    p_presentation text,
    p_street text,
    p_number text,
    p_floor text,
    p_door text,
    p_postal_code text,
    p_city text,
    p_province text,
    p_country text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_address_id uuid;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.accounts
        WHERE id = (SELECT auth.uid())
          AND account_type = 'tutor'
    ) THEN
        RAISE EXCEPTION 'Only tutors can edit tutor profiles'
            USING ERRCODE = '42501';
    END IF;

    SELECT address_id INTO v_address_id
    FROM public.technical_sheets
    WHERE provider_id = (SELECT auth.uid())
      AND provider_type = 'private_tutor'
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    IF v_address_id IS NULL THEN
        RAISE EXCEPTION 'Tutor profile not found'
            USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.technical_sheets
    SET first_name = p_first_name,
        last_name = p_last_name,
        description = p_presentation
    WHERE provider_id = (SELECT auth.uid())
      AND address_id = v_address_id
      AND provider_type = 'private_tutor';

    UPDATE public.addresses
    SET street = p_street,
        number = p_number,
        floor = NULLIF(btrim(p_floor), ''),
        door = NULLIF(btrim(p_door), ''),
        postal_code = p_postal_code,
        city = p_city,
        province = p_province,
        country = p_country
    WHERE id = v_address_id
      AND provider_id = (SELECT auth.uid());

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tutor address not found'
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_tutor_profile(
    text, text, text, text, text, text,
    text, text, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_my_tutor_profile(
    text, text, text, text, text, text,
    text, text, text, text, text
) TO authenticated;
