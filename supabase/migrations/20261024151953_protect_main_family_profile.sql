
-- Issue #20: protect the oldest family profile.
--
-- The main profile is derived from creation order.
-- No is_main column is added to family_profiles.

CREATE OR REPLACE FUNCTION public.protect_main_family_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  main_profile_id UUID;
BEGIN
  SELECT fp.id
  INTO main_profile_id
  FROM public.family_profiles AS fp
  WHERE fp.family_group_id = OLD.family_group_id
  ORDER BY fp.created_at ASC, fp.id ASC
  LIMIT 1;

  IF OLD.id = main_profile_id THEN
    RAISE EXCEPTION
      'The main family profile cannot be deleted'
      USING ERRCODE = '23514';
  END IF;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_main_family_profile()
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.protect_main_family_profile()
FROM anon, authenticated;

CREATE TRIGGER protect_main_family_profile_before_delete
BEFORE DELETE ON public.family_profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_main_family_profile();
