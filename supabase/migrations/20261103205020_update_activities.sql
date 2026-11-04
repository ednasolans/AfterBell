-- C11 / #76 #77 #87 #101 #102 #106 #128.
ALTER TABLE public.activities DROP CONSTRAINT activities_type_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_type_check
    CHECK (type IN ('whole_year','event','temporary'));
ALTER TABLE public.activities
    ADD COLUMN start_date date,
    ADD COLUMN end_date date,
    ADD COLUMN status text NOT NULL DEFAULT 'published',
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN is_tutor boolean NOT NULL DEFAULT false;
ALTER TABLE public.activities ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.activities
    ADD CONSTRAINT activities_status_check CHECK (status IN ('draft','published')),
    ADD CONSTRAINT activities_dates_check CHECK (
        (start_date IS NULL AND end_date IS NULL) OR
        (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date)
    ),
    ADD CONSTRAINT activities_temporary_dates_check CHECK (
        type <> 'temporary' OR start_date IS NOT NULL
    );
ALTER TABLE public.activities DROP CONSTRAINT activities_target_age_ranges_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_target_age_ranges_check CHECK (
    cardinality(target_age_ranges) > 0 AND
    target_age_ranges <@ ARRAY['0-3','4-6','7-9','10-12','13-15','16-17','adult','all_publics']::text[]
);
-- Existing schedule validation is strict. Permit date-specific activities without weekly slots.
ALTER TABLE public.activities DROP CONSTRAINT activity_schedule_is_valid;
ALTER TABLE public.activities ALTER COLUMN schedule DROP NOT NULL;
ALTER TABLE public.activities ADD CONSTRAINT activity_schedule_valid_for_type CHECK (
    (type = 'whole_year' AND public.is_valid_schedule(schedule)) OR
    (type IN ('event','temporary') AND (schedule IS NULL OR public.is_valid_schedule(schedule)))
);
CREATE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE TRIGGER activities_touch_updated_at BEFORE UPDATE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
DROP POLICY "Logged-in users can read activities" ON public.activities;
CREATE POLICY "Published activities or owner" ON public.activities
    FOR SELECT TO authenticated USING (status = 'published' OR provider_id = (SELECT auth.uid()));
GRANT UPDATE (type, start_date, end_date, status, is_tutor)
    ON public.activities TO authenticated;
-- Keep max_participants 1..1000 from main; no unlimited value has been specified.
CREATE INDEX activities_category_idx ON public.activities(category);
CREATE INDEX activities_price_idx ON public.activities(price);
CREATE INDEX activities_date_idx ON public.activities(start_date, end_date);
CREATE INDEX activities_published_idx ON public.activities(status);
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
ALTER TABLE public.activities ADD COLUMN search_normalized text;
CREATE FUNCTION public.refresh_activity_search()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    NEW.search_normalized := lower(extensions.unaccent(coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,'')));
    RETURN NEW;
END; $$;
UPDATE public.activities SET search_normalized = lower(extensions.unaccent(coalesce(title,'') || ' ' || coalesce(description,'')));
ALTER TABLE public.activities ALTER COLUMN search_normalized SET NOT NULL;
CREATE TRIGGER refresh_activity_search BEFORE INSERT OR UPDATE OF title, description ON public.activities
    FOR EACH ROW EXECUTE FUNCTION public.refresh_activity_search();
CREATE INDEX activities_search_trgm_idx ON public.activities
    USING gin (search_normalized extensions.gin_trgm_ops);
REVOKE ALL ON FUNCTION public.refresh_activity_search() FROM PUBLIC, anon, authenticated;
