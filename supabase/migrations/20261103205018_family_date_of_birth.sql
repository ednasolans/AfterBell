-- C11 / #129. Existing age brackets do NOT determine a date of birth.
ALTER TABLE public.family_profiles ADD COLUMN date_of_birth date;
ALTER TABLE public.family_profiles ALTER COLUMN age_range DROP NOT NULL;
ALTER TABLE public.family_profiles
    ADD CONSTRAINT family_dob_reasonable CHECK (date_of_birth IS NULL OR date_of_birth >= DATE '1900-01-01');
-- Do not backfill invented birth dates. Existing profiles remain NULL until edited.
GRANT INSERT (date_of_birth) ON public.family_profiles TO authenticated;
GRANT UPDATE (date_of_birth) ON public.family_profiles TO authenticated;
-- Keep age_range temporarily for legacy forms; remove after the app has switched.
-- A CHECK using CURRENT_DATE is not immutable; use a trigger for future dates.
CREATE FUNCTION public.validate_family_date_of_birth()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NEW.date_of_birth > current_date THEN
    RAISE EXCEPTION 'Date of birth cannot be in the future' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER family_date_of_birth_valid
 BEFORE INSERT OR UPDATE OF date_of_birth ON public.family_profiles
 FOR EACH ROW EXECUTE FUNCTION public.validate_family_date_of_birth();
REVOKE ALL ON FUNCTION public.validate_family_date_of_birth() FROM PUBLIC,anon,authenticated;
