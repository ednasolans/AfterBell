
BEGIN;

DO $$
DECLARE
  test_group_id UUID;
  first_profile_id UUID;
  second_profile_id UUID;
  deleted_count INTEGER;
BEGIN
  INSERT INTO public.family_groups DEFAULT VALUES
  RETURNING id INTO test_group_id;

  INSERT INTO public.family_profiles (
    family_group_id,
    first_name,
    date_of_birth,
    interests
  )
  VALUES (
    test_group_id,
    'Anna',
    DATE '2018-03-01',
    ARRAY['music']::TEXT[]
  )
  RETURNING id INTO first_profile_id;

  INSERT INTO public.family_profiles (
    family_group_id,
    first_name,
    date_of_birth,
    interests
  )
  VALUES (
    test_group_id,
    'Marc',
    DATE '2015-03-01',
    ARRAY['football']::TEXT[]
  )
  RETURNING id INTO second_profile_id;

  -- The first profile must be protected.
  BEGIN
    DELETE FROM public.family_profiles
    WHERE id = first_profile_id;

    RAISE EXCEPTION
      'Expected deletion of main profile to fail';

  EXCEPTION
    WHEN check_violation THEN
      -- Expected rejection from the database trigger.
      NULL;
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM public.family_profiles
    WHERE id = first_profile_id
  ) THEN
    RAISE EXCEPTION
      'The main profile was deleted';
  END IF;

  -- A secondary profile must be deletable.
  DELETE FROM public.family_profiles
  WHERE id = second_profile_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count <> 1 THEN
    RAISE EXCEPTION
      'Expected one secondary profile to be deleted';
  END IF;

  -- Exactly one profile remains.
  IF (
    SELECT COUNT(*)
    FROM public.family_profiles
    WHERE family_group_id = test_group_id
  ) <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one remaining profile';
  END IF;

  -- The remaining main profile must still be protected.
  BEGIN
    DELETE FROM public.family_profiles
    WHERE id = first_profile_id;

    RAISE EXCEPTION
      'Expected deletion of last profile to fail';

  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;

  RAISE NOTICE
    'Main profile protection and secondary deletion tests passed';
END;
$$;

ROLLBACK;
