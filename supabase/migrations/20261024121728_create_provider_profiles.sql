-- AfterBell - Issue #29
-- AI-generated provider profile (draft until the provider approves it)


-- 1. PROVIDER PROFILES TABLE

CREATE TABLE public.provider_profiles (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    -- One profile per provider, filled automatically with the logged-in user
    provider_id UUID NOT NULL UNIQUE
        DEFAULT auth.uid()
        REFERENCES public.accounts(id)
        ON DELETE CASCADE,

    headline TEXT NOT NULL
        CHECK (btrim(headline) <> '' AND char_length(headline) <= 120),

    description TEXT NOT NULL
        CHECK (btrim(description) <> '' AND char_length(description) <= 2000),

    -- 'draft' until the provider approves it (human in the loop)
    status TEXT NOT NULL
        DEFAULT 'draft'
        CHECK (status IN ('draft', 'approved')),

    -- LLM that generated the text, e.g. 'gemini-3.5-flash-lite'
    model TEXT NOT NULL
        CHECK (btrim(model) <> '' AND char_length(model) <= 100),

    generated_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    -- Filled by the trigger below, never by the app
    approved_at TIMESTAMPTZ,

    CONSTRAINT approved_at_matches_status
        CHECK ((status = 'approved') = (approved_at IS NOT NULL))

);


-- 2. APPROVAL DATE

CREATE FUNCTION public.set_profile_approved_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NEW.status = 'approved' THEN
        IF TG_OP = 'INSERT' OR OLD.status <> 'approved' THEN
            NEW.approved_at := NOW();
        END IF;
    ELSE
        NEW.approved_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_profile_approved_at
    BEFORE INSERT OR UPDATE ON public.provider_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_profile_approved_at();


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.provider_profiles
ENABLE ROW LEVEL SECURITY;


-- Approved profiles are public to logged-in users; drafts only to their owner.

CREATE POLICY "Approved profiles are public, drafts only for the owner"

ON public.provider_profiles

FOR SELECT

TO authenticated

USING (
    status = 'approved'
    OR (SELECT auth.uid()) = provider_id
);


-- Only company accounts can create a profile, only for themselves, and only as a draft.

CREATE POLICY "Companies can create their own draft profile"

ON public.provider_profiles

FOR INSERT

TO authenticated

WITH CHECK (
    (SELECT auth.uid()) = provider_id
    AND (SELECT public.is_company())
    AND status = 'draft'
);


-- Providers can update only their own profile (edit the draft and approve it).

CREATE POLICY "Providers can update their own profile"

ON public.provider_profiles

FOR UPDATE

TO authenticated

USING (
    (SELECT auth.uid()) = provider_id
)

WITH CHECK (
    (SELECT auth.uid()) = provider_id
);


-- No DELETE policy: profiles are never deleted from the app.


-- 4. TABLE PRIVILEGES

REVOKE ALL
ON TABLE public.provider_profiles
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT
ON TABLE public.provider_profiles
TO authenticated;

-- id, provider_id and approved_at cannot be changed by the app.

GRANT UPDATE (
    headline, description, status, model, generated_at
)
ON TABLE public.provider_profiles
TO authenticated;