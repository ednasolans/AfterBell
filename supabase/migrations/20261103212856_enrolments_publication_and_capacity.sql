-- C11 / #87 #91 #97 #117. SEC DEFINER RPCs validate auth.uid() explicitly.
CREATE FUNCTION public.send_enrolment_request(
 p_activity_id uuid, p_family_profile_id uuid, p_message text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.accounts WHERE id=auth.uid() AND account_type='customer') THEN
   RAISE EXCEPTION 'Only customer accounts can request enrolment' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.family_profiles fp WHERE fp.id=p_family_profile_id
   AND public.is_family_member(fp.family_group_id)) THEN
   RAISE EXCEPTION 'Family profile is not accessible' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.activities a WHERE a.id=p_activity_id AND a.status='published'
   AND (a.end_date IS NULL OR a.end_date>=current_date)) THEN
   RAISE EXCEPTION 'Activity not available for enrolment' USING ERRCODE='23514';
 END IF;
 INSERT INTO public.enrolment_requests(activity_id,customer_id,family_profile_id,message)
 VALUES (p_activity_id,auth.uid(),p_family_profile_id,p_message)
 RETURNING id INTO result_id;
 RETURN result_id;
END; $$;

CREATE FUNCTION public.accept_enrolment_request(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_activity_id uuid; v_owner uuid; v_limit integer; v_status text; v_count integer;
BEGIN
 SELECT er.activity_id INTO v_activity_id FROM public.enrolment_requests er WHERE er.id=p_request_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found' USING ERRCODE='P0002'; END IF;
 -- All acceptances on the same activity serialize on this row.
 SELECT a.provider_id,a.max_participants INTO v_owner,v_limit
 FROM public.activities a WHERE a.id=v_activity_id FOR UPDATE;
 IF v_owner IS DISTINCT FROM auth.uid() THEN
   RAISE EXCEPTION 'Not the activity provider' USING ERRCODE='42501';
 END IF;
 SELECT er.status INTO v_status FROM public.enrolment_requests er WHERE er.id=p_request_id FOR UPDATE;
 IF v_status <> 'pending' THEN RAISE EXCEPTION 'Request is not pending' USING ERRCODE='23514'; END IF;
 SELECT count(*) INTO v_count FROM public.enrolment_requests er
 WHERE er.activity_id=v_activity_id AND er.status='accepted';
 IF v_count>=v_limit THEN RAISE EXCEPTION 'Activity is full' USING ERRCODE='23514'; END IF;
 UPDATE public.enrolment_requests SET status='accepted' WHERE id=p_request_id;
END; $$;

CREATE FUNCTION public.reject_enrolment_request(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_owner uuid;
BEGIN
 SELECT a.provider_id INTO v_owner FROM public.enrolment_requests er
 JOIN public.activities a ON a.id=er.activity_id WHERE er.id=p_request_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found' USING ERRCODE='P0002'; END IF;
 IF v_owner IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not the provider' USING ERRCODE='42501'; END IF;
 UPDATE public.enrolment_requests SET status='rejected'
 WHERE id=p_request_id AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Request is not pending' USING ERRCODE='23514'; END IF;
END; $$;

CREATE FUNCTION public.cancel_enrolment_request(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_customer uuid; v_activity_id uuid;
BEGIN
 SELECT er.customer_id,er.activity_id INTO v_customer,v_activity_id
 FROM public.enrolment_requests er WHERE er.id=p_request_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found' USING ERRCODE='P0002'; END IF;
 IF v_customer IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not the requesting customer' USING ERRCODE='42501'; END IF;
 -- Serialize a cancellation with acceptances for consistent capacity accounting.
 PERFORM 1 FROM public.activities a WHERE a.id=v_activity_id FOR UPDATE;
 UPDATE public.enrolment_requests SET status='cancelled'
 WHERE id=p_request_id AND status IN ('pending','accepted');
 IF NOT FOUND THEN RAISE EXCEPTION 'Request cannot be cancelled' USING ERRCODE='23514'; END IF;
END; $$;

CREATE FUNCTION public.activity_capacity(p_activity_id uuid)
RETURNS TABLE(max_participants integer,taken_places bigint,available_places bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT a.max_participants,
   (SELECT count(*) FROM public.enrolment_requests er WHERE er.activity_id=a.id AND er.status='accepted'),
   a.max_participants::bigint-(SELECT count(*) FROM public.enrolment_requests er
      WHERE er.activity_id=a.id AND er.status='accepted')
 FROM public.activities a WHERE a.id=p_activity_id
 AND (a.status='published' OR a.provider_id=auth.uid());
$$;

-- Publication prerequisites: complete sheet, valid category/address, dated temporary
-- activity, and language-level rows when the offer is a language/tutoring activity.
CREATE FUNCTION public.can_publish_activity(p_activity_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.activities a
  JOIN public.categories c ON c.name=a.category
  JOIN public.addresses ad ON ad.id=a.address_id AND ad.provider_id=a.provider_id
  WHERE a.id=p_activity_id
    AND EXISTS(SELECT 1 FROM public.technical_sheets ts
      WHERE ts.provider_id=a.provider_id AND btrim(ts.name)<>''
        AND (ts.email IS NOT NULL OR ts.phone_number IS NOT NULL))
    AND (a.type<>'temporary' OR (a.start_date IS NOT NULL AND a.end_date IS NOT NULL))
    AND (a.category<>'language' AND NOT a.is_tutor OR EXISTS(
      SELECT 1 FROM public.languages l WHERE l.activity_id=a.id))
 );
$$;

-- Validate against NEW row, because the row might be edited and published in one UPDATE.
CREATE FUNCTION public.require_publication_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.status='published' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
   IF NOT EXISTS(SELECT 1 FROM public.technical_sheets ts
     WHERE ts.provider_id=NEW.provider_id AND btrim(ts.name)<>''
       AND (ts.email IS NOT NULL OR ts.phone_number IS NOT NULL)) THEN
     RAISE EXCEPTION 'Complete technical sheet required to publish' USING ERRCODE='23514';
   END IF;
   IF NEW.type='temporary' AND (NEW.start_date IS NULL OR NEW.end_date IS NULL) THEN
     RAISE EXCEPTION 'Temporary activity requires dates' USING ERRCODE='23514';
   END IF;
   IF (NEW.category='language' OR NEW.is_tutor) AND
     NOT EXISTS(SELECT 1 FROM public.languages l WHERE l.activity_id=NEW.id) THEN
     RAISE EXCEPTION 'Language and level required to publish' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER activities_require_publication_fields
 BEFORE INSERT OR UPDATE OF status ON public.activities
 FOR EACH ROW EXECUTE FUNCTION public.require_publication_fields();

REVOKE ALL ON FUNCTION public.send_enrolment_request(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.accept_enrolment_request(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reject_enrolment_request(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cancel_enrolment_request(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.activity_capacity(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.can_publish_activity(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.require_publication_fields() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.send_enrolment_request(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_enrolment_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_enrolment_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_enrolment_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activity_capacity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_publish_activity(uuid) TO authenticated;
