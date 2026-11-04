-- C11 / #81 #82. Keep the approved copy when a candidate is being reviewed.
ALTER TABLE public.provider_profiles
    ADD COLUMN approved_headline text,
    ADD COLUMN approved_description text,
    ADD COLUMN sheet_updated_at timestamptz;
UPDATE public.provider_profiles
SET approved_headline = headline, approved_description = description
WHERE status = 'approved';
ALTER TABLE public.provider_profiles
    DROP CONSTRAINT provider_profiles_status_check,
    DROP CONSTRAINT approved_at_matches_status;
ALTER TABLE public.provider_profiles
    ADD CONSTRAINT provider_profiles_status_check
        CHECK (status IN ('draft','pending_approval','approved')),
    ADD CONSTRAINT provider_profiles_approved_pair_check
        CHECK ((approved_headline IS NULL) = (approved_description IS NULL));
CREATE OR REPLACE FUNCTION public.set_profile_approved_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF NEW.status = 'approved' THEN
        IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved'
           OR NEW.headline IS DISTINCT FROM OLD.headline
           OR NEW.description IS DISTINCT FROM OLD.description THEN
            NEW.approved_at := now();
        END IF;
        NEW.approved_headline := NEW.headline;
        NEW.approved_description := NEW.description;
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.approved_at := OLD.approved_at;
        NEW.approved_headline := OLD.approved_headline;
        NEW.approved_description := OLD.approved_description;
    ELSE
        NEW.approved_at := NULL;
        NEW.approved_headline := NULL;
        NEW.approved_description := NULL;
    END IF;
    RETURN NEW;
END; $$;
-- Base table contains pending private text, so only owner reads it.
DROP POLICY "Approved profiles are public, drafts only for the owner" ON public.provider_profiles;
CREATE POLICY "Owner reads candidate profile" ON public.provider_profiles
    FOR SELECT TO authenticated USING (provider_id = (SELECT auth.uid()));
GRANT UPDATE (sheet_updated_at) ON public.provider_profiles TO authenticated;
-- Snapshot the source sheet's updated_at when new AI content is saved.
CREATE FUNCTION public.snapshot_profile_sheet_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 SELECT ts.updated_at INTO NEW.sheet_updated_at
 FROM public.technical_sheets ts WHERE ts.provider_id=NEW.provider_id
 ORDER BY ts.updated_at DESC, ts.id DESC LIMIT 1;
 RETURN NEW;
END; $$;
CREATE TRIGGER snapshot_profile_sheet_updated_at
 BEFORE INSERT OR UPDATE OF headline, description, model, generated_at
 ON public.provider_profiles FOR EACH ROW
 EXECUTE FUNCTION public.snapshot_profile_sheet_updated_at();
REVOKE ALL ON FUNCTION public.snapshot_profile_sheet_updated_at() FROM PUBLIC,anon,authenticated;
