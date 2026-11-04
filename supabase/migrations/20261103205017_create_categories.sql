-- C11 / #86: master categories and migration of existing values.
CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE CHECK (btrim(name) <> ''),
    category_type text NOT NULL CHECK (category_type IN ('individual','collective'))
);
-- Existing names come from main. Validate individual/collective labels with the team.
INSERT INTO public.categories(name, category_type) VALUES
 ('football','collective'),('basketball','collective'),('tennis','individual'),
 ('swimming','individual'),('dance','collective'),('drama','collective'),
 ('music','individual'),('language','individual'),('art','individual'),
 ('tutoring','individual'),('other','collective');

ALTER TABLE public.activities DROP CONSTRAINT activities_category_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_category_fkey
    FOREIGN KEY(category) REFERENCES public.categories(name) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE public.technical_sheets DROP CONSTRAINT technical_sheets_activity_types_check;
ALTER TABLE public.family_profiles DROP CONSTRAINT family_profiles_interests_valid;

CREATE FUNCTION public.check_category_array()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE vals text[];
BEGIN
    IF TG_TABLE_NAME = 'technical_sheets' THEN vals := NEW.activity_types;
    ELSE vals := NEW.interests; END IF;
    IF EXISTS (
        SELECT 1 FROM unnest(vals) AS v(name)
        WHERE v.name IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.categories AS c WHERE c.name = v.name
        )
    ) THEN RAISE EXCEPTION 'Unknown category in %', TG_TABLE_NAME USING ERRCODE = '23514'; END IF;
    RETURN NEW;
END; $$;
CREATE TRIGGER check_technical_sheet_categories
    BEFORE INSERT OR UPDATE OF activity_types ON public.technical_sheets
    FOR EACH ROW EXECUTE FUNCTION public.check_category_array();
CREATE TRIGGER check_family_profile_categories
    BEFORE INSERT OR UPDATE OF interests ON public.family_profiles
    FOR EACH ROW EXECUTE FUNCTION public.check_category_array();
REVOKE ALL ON FUNCTION public.check_category_array() FROM PUBLIC, anon, authenticated;
-- Catalog names cannot be changed/deleted: arrays reference them via the trigger above.
CREATE FUNCTION public.prevent_category_rename_or_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    RAISE EXCEPTION 'Category names are immutable; add new categories in a migration';
END; $$;
CREATE TRIGGER categories_immutable_names BEFORE UPDATE OF name OR DELETE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.prevent_category_rename_or_delete();
REVOKE ALL ON FUNCTION public.prevent_category_rename_or_delete() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read categories" ON public.categories FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.categories FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.categories TO authenticated;
