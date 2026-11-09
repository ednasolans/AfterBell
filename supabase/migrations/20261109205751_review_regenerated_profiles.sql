-- C2 (#81, #82): regenerate and edit an approved AI profile.
--
-- C11 added the review states (draft, pending_approval, approved) and keeps a
-- copy of the approved text (approved_headline, approved_description) that is
-- the only one customers can see. This migration completes the rules:
--
-- 1. Editing the text of an approved profile never publishes it directly:
--    the profile moves to pending_approval and the approved copy stays.
-- 2. approved_at only changes when a different text is approved, so going
--    back to the approved version keeps its date.
-- 3. sheet_updated_at is the technical sheet version used by the AI. It is
--    taken only when the AI generates the text (generated_at changes), never
--    on manual edits, and the app cannot change it.
-- 4. my_profile_is_outdated(): the technical sheet changed after the AI wrote
--    the profile.
-- 5. discard_profile_changes(): go back to the approved version.


-- ============================================================
-- 1 and 2. Review rules in the existing trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_profile_approved_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- New text on an approved profile needs a new approval (human-in-the-loop)
    IF TG_OP = 'UPDATE'
       AND OLD.status = 'approved'
       AND NEW.status = 'approved'
       AND (NEW.headline IS DISTINCT FROM OLD.headline
            OR NEW.description IS DISTINCT FROM OLD.description) THEN
        NEW.status := 'pending_approval';
    END IF;

    IF NEW.status = 'approved' THEN
        -- A different text is being approved: it gets a new date
        IF TG_OP = 'INSERT'
           OR NEW.headline IS DISTINCT FROM OLD.approved_headline
           OR NEW.description IS DISTINCT FROM OLD.approved_description THEN
            NEW.approved_at := now();
        ELSE
            NEW.approved_at := OLD.approved_at;
        END IF;
        NEW.approved_headline := NEW.headline;
        NEW.approved_description := NEW.description;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Drafts and pending versions keep the copy customers see
        NEW.approved_at := OLD.approved_at;
        NEW.approved_headline := OLD.approved_headline;
        NEW.approved_description := OLD.approved_description;
    ELSE
        NEW.approved_at := NULL;
        NEW.approved_headline := NULL;
        NEW.approved_description := NULL;
    END IF;

    RETURN NEW;
END;
$$;


-- ============================================================
-- 3. The sheet version is taken only when the AI writes the text
-- ============================================================

DROP TRIGGER snapshot_profile_sheet_updated_at ON public.provider_profiles;

CREATE TRIGGER snapshot_profile_sheet_updated_at
    BEFORE INSERT OR UPDATE OF generated_at ON public.provider_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.snapshot_profile_sheet_updated_at();

-- Only the trigger sets it: the app could otherwise hide the outdated warning
REVOKE UPDATE (sheet_updated_at) ON public.provider_profiles FROM authenticated;


-- ============================================================
-- 4. Is my profile out of date?
-- True when the technical sheet changed after the AI wrote the profile, or
-- when the profile was generated before this was recorded. False when the
-- caller has no profile.
-- ============================================================

CREATE FUNCTION public.my_profile_is_outdated()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
    SELECT COALESCE((
        SELECT p.sheet_updated_at IS NULL
            OR EXISTS (
                SELECT 1
                FROM public.technical_sheets ts
                WHERE ts.provider_id = p.provider_id
                  AND ts.updated_at > p.sheet_updated_at
            )
        FROM public.provider_profiles p
        WHERE p.provider_id = (SELECT auth.uid())
    ), false);
$$;

REVOKE ALL ON FUNCTION public.my_profile_is_outdated() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_profile_is_outdated() TO authenticated;


-- ============================================================
-- 5. Go back to the approved version
-- Returns false when there is nothing to discard (no pending version, or the
-- profile was never approved). Runs with the caller's rights, so RLS applies.
-- ============================================================

CREATE FUNCTION public.discard_profile_changes()
RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    UPDATE public.provider_profiles
    SET headline = approved_headline,
        description = approved_description,
        status = 'approved'
    WHERE provider_id = (SELECT auth.uid())
      AND status = 'pending_approval'
      AND approved_headline IS NOT NULL;
    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.discard_profile_changes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discard_profile_changes() TO authenticated;