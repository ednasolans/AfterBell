-- C11 / #114. Invoke ONLY from trusted backend/service_role.
-- The backend supplies its configured max requests and window in minutes.
-- Concurrency is serialized by locking the accounts row for this user.
CREATE FUNCTION public.register_search_summary_request(
 p_user_id uuid, p_max_requests integer, p_window_minutes integer
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n bigint;
BEGIN
 IF p_max_requests NOT BETWEEN 1 AND 1000 OR p_window_minutes NOT BETWEEN 1 AND 1440 THEN
   RAISE EXCEPTION 'Invalid rate-limit settings' USING ERRCODE='22023';
 END IF;
 PERFORM 1 FROM public.accounts WHERE id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT count(*) INTO n FROM public.search_summary_requests
 WHERE user_id=p_user_id AND requested_at > now() - make_interval(mins=>p_window_minutes);
 IF n>=p_max_requests THEN RETURN false; END IF;
 INSERT INTO public.search_summary_requests(user_id) VALUES(p_user_id);
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.register_search_summary_request(uuid,integer,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_search_summary_request(uuid,integer,integer)
 TO service_role;
