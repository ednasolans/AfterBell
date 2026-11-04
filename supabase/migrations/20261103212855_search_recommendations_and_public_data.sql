-- C11 / #71 #101 #102 #106 #119 (public provider profile projection too).
-- Public contact fields without exposing technical_sheets directly.
CREATE FUNCTION public.public_provider_contacts()
RETURNS TABLE(provider_id uuid, name text, email text, phone_number text, website text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT DISTINCT ON (t.provider_id)
    t.provider_id, t.name, t.email, t.phone_number, t.website
 FROM public.technical_sheets t
 WHERE EXISTS (
    SELECT 1 FROM public.activities a
    WHERE a.provider_id=t.provider_id AND a.status='published'
 )
 ORDER BY t.provider_id, t.created_at DESC, t.id DESC;
$$;

-- Show only approved columns (never the pending headline/description).
CREATE FUNCTION public.public_approved_provider_profiles()
RETURNS TABLE(provider_id uuid, headline text, description text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT p.provider_id, p.approved_headline, p.approved_description
 FROM public.provider_profiles p
 WHERE p.approved_headline IS NOT NULL AND p.approved_description IS NOT NULL;
$$;

CREATE FUNCTION public.search_activities(
 p_query text DEFAULT NULL, p_category text DEFAULT NULL,
 p_city text DEFAULT NULL, p_price_min numeric DEFAULT NULL,
 p_price_max numeric DEFAULT NULL, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0
)
RETURNS SETOF public.activities
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT a.* FROM public.activities a
 JOIN public.addresses ad ON ad.id=a.address_id
 WHERE a.status='published'
   AND (p_query IS NULL OR btrim(p_query)='' OR
       a.search_normalized LIKE '%' || lower(extensions.unaccent(btrim(p_query))) || '%')
   AND (p_category IS NULL OR a.category=p_category)
   AND (p_city IS NULL OR lower(ad.city)=lower(p_city))
   AND (p_price_min IS NULL OR a.price>=p_price_min)
   AND (p_price_max IS NULL OR a.price<=p_price_max)
 ORDER BY a.created_at DESC,a.id
 LIMIT greatest(1,least(coalesce(p_limit,20),100))
 OFFSET greatest(0,coalesce(p_offset,0));
$$;

CREATE FUNCTION public.available_activity_filters()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT jsonb_build_object(
  'categories',coalesce((SELECT jsonb_agg(c.name ORDER BY c.name) FROM public.categories c),'[]'::jsonb),
  'cities',coalesce((SELECT jsonb_agg(x.city ORDER BY x.city) FROM
     (SELECT DISTINCT ad.city FROM public.activities a JOIN public.addresses ad ON ad.id=a.address_id
      WHERE a.status='published') x),'[]'::jsonb),
  'min_price',(SELECT min(price) FROM public.activities WHERE status='published'),
  'max_price',(SELECT max(price) FROM public.activities WHERE status='published')
 );
$$;

-- The present family/account schema has NO customer city. It must be passed
-- by the client as p_city (not guessed from provider addresses).
CREATE FUNCTION public.recommend_activities(p_family_profile_id uuid, p_city text)
RETURNS SETOF public.activities
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE birth date; years integer;
BEGIN
 SELECT fp.date_of_birth INTO birth FROM public.family_profiles fp
 WHERE fp.id=p_family_profile_id AND public.is_family_member(fp.family_group_id);
 IF NOT FOUND OR birth IS NULL THEN RETURN; END IF;
 years := extract(year FROM age(current_date,birth))::integer;
 RETURN QUERY
 SELECT a.* FROM public.activities a
 JOIN public.addresses ad ON ad.id=a.address_id
 WHERE a.status='published'
   AND (a.end_date IS NULL OR a.end_date>=current_date)
   AND (p_city IS NULL OR lower(ad.city)=lower(p_city))
   AND (
     'all_publics'=ANY(a.target_age_ranges)
     OR (years BETWEEN 0 AND 3 AND '0-3'=ANY(a.target_age_ranges))
     OR (years BETWEEN 4 AND 6 AND '4-6'=ANY(a.target_age_ranges))
     OR (years BETWEEN 7 AND 9 AND '7-9'=ANY(a.target_age_ranges))
     OR (years BETWEEN 10 AND 12 AND '10-12'=ANY(a.target_age_ranges))
     OR (years BETWEEN 13 AND 15 AND '13-15'=ANY(a.target_age_ranges))
     OR (years BETWEEN 16 AND 17 AND '16-17'=ANY(a.target_age_ranges))
     OR (years >=18 AND 'adult'=ANY(a.target_age_ranges))
   ) ORDER BY a.created_at DESC,a.id LIMIT 50;
END; $$;

-- Only accepted family profiles on the caller's own activities.
CREATE FUNCTION public.provider_enrolled_family_profiles(p_activity_id uuid)
RETURNS TABLE(first_name text, age_years integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.activities a WHERE a.id=p_activity_id AND a.provider_id=auth.uid()) THEN
  RAISE EXCEPTION 'Not the activity owner' USING ERRCODE='42501';
 END IF;
 RETURN QUERY
 SELECT fp.first_name,
   CASE WHEN fp.date_of_birth IS NULL THEN NULL
        ELSE extract(year FROM age(current_date,fp.date_of_birth))::integer END
 FROM public.enrolment_requests er
 JOIN public.family_profiles fp ON fp.id=er.family_profile_id
 WHERE er.activity_id=p_activity_id AND er.status='accepted'
 ORDER BY fp.first_name;
END; $$;

REVOKE ALL ON FUNCTION public.public_provider_contacts() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.public_approved_provider_profiles() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.search_activities(text,text,text,numeric,numeric,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.available_activity_filters() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.recommend_activities(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.provider_enrolled_family_profiles(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.public_provider_contacts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_approved_provider_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_activities(text,text,text,numeric,numeric,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.available_activity_filters() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recommend_activities(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_enrolled_family_profiles(uuid) TO authenticated;
