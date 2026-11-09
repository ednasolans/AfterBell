-- #117: rules of the enrolment requests.
-- - A request for a full activity is rejected (team decision): a pending
--   request that can never be accepted would only confuse the family.
-- - A family profile with an active request gets a clear message instead of
--   the unique index violation.
-- - Activities without a limit accept every request.
-- - activity_capacity returns NULL available places when there is no limit.
-- Sending also locks the activity row, like accepting, so the capacity check
-- of a request and an acceptance cannot interleave.

CREATE OR REPLACE FUNCTION public.send_enrolment_request(
    p_activity_id uuid,
    p_family_profile_id uuid,
    p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_limit integer;
    v_taken integer;
    result_id uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.accounts
        WHERE id = auth.uid() AND account_type = 'customer'
    ) THEN
        RAISE EXCEPTION 'Only customer accounts can request enrolment'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.family_profiles fp
        WHERE fp.id = p_family_profile_id
          AND public.is_family_member(fp.family_group_id)
    ) THEN
        RAISE EXCEPTION 'Family profile is not accessible' USING ERRCODE = '42501';
    END IF;

    SELECT a.max_participants INTO v_limit
    FROM public.activities a
    WHERE a.id = p_activity_id
      AND a.status = 'published'
      AND (a.end_date IS NULL OR a.end_date >= current_date)
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'This activity is not available for enrolment'
            USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.enrolment_requests er
        WHERE er.activity_id = p_activity_id
          AND er.family_profile_id = p_family_profile_id
          AND er.status IN ('pending', 'accepted')
    ) THEN
        RAISE EXCEPTION 'This family profile already has a request for this activity'
            USING ERRCODE = '23505';
    END IF;

    IF v_limit IS NOT NULL THEN
        SELECT count(*) INTO v_taken
        FROM public.enrolment_requests er
        WHERE er.activity_id = p_activity_id AND er.status = 'accepted';
        IF v_taken >= v_limit THEN
            RAISE EXCEPTION 'This activity is full' USING ERRCODE = '23514';
        END IF;
    END IF;

    INSERT INTO public.enrolment_requests (activity_id, customer_id, family_profile_id, message)
    VALUES (p_activity_id, auth.uid(), p_family_profile_id, NULLIF(btrim(p_message), ''))
    RETURNING id INTO result_id;

    RETURN result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_enrolment_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_activity_id uuid;
    v_owner uuid;
    v_limit integer;
    v_status text;
    v_taken integer;
BEGIN
    SELECT er.activity_id INTO v_activity_id
    FROM public.enrolment_requests er WHERE er.id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found' USING ERRCODE = 'P0002';
    END IF;

    -- All the requests and acceptances of an activity wait for this lock
    SELECT a.provider_id, a.max_participants INTO v_owner, v_limit
    FROM public.activities a WHERE a.id = v_activity_id
    FOR UPDATE;
    IF v_owner IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Not the activity provider' USING ERRCODE = '42501';
    END IF;

    SELECT er.status INTO v_status
    FROM public.enrolment_requests er WHERE er.id = p_request_id
    FOR UPDATE;
    IF v_status <> 'pending' THEN
        RAISE EXCEPTION 'Only pending requests can be accepted' USING ERRCODE = '23514';
    END IF;

    IF v_limit IS NOT NULL THEN
        SELECT count(*) INTO v_taken
        FROM public.enrolment_requests er
        WHERE er.activity_id = v_activity_id AND er.status = 'accepted';
        IF v_taken >= v_limit THEN
            RAISE EXCEPTION 'There are no places left in this activity'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    UPDATE public.enrolment_requests SET status = 'accepted' WHERE id = p_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_enrolment_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_owner uuid;
BEGIN
    SELECT a.provider_id INTO v_owner
    FROM public.enrolment_requests er
    JOIN public.activities a ON a.id = er.activity_id
    WHERE er.id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found' USING ERRCODE = 'P0002';
    END IF;
    IF v_owner IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Not the activity provider' USING ERRCODE = '42501';
    END IF;

    UPDATE public.enrolment_requests SET status = 'rejected'
    WHERE id = p_request_id AND status = 'pending';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Only pending requests can be rejected' USING ERRCODE = '23514';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_enrolment_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_customer uuid;
    v_activity_id uuid;
BEGIN
    SELECT er.customer_id, er.activity_id INTO v_customer, v_activity_id
    FROM public.enrolment_requests er WHERE er.id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found' USING ERRCODE = 'P0002';
    END IF;
    IF v_customer IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Not the requesting customer' USING ERRCODE = '42501';
    END IF;

    -- Same lock as accepting, so the released place is counted consistently
    PERFORM 1 FROM public.activities a WHERE a.id = v_activity_id FOR UPDATE;

    UPDATE public.enrolment_requests SET status = 'cancelled'
    WHERE id = p_request_id AND status IN ('pending', 'accepted');
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Only pending or accepted requests can be cancelled'
            USING ERRCODE = '23514';
    END IF;
END;
$$;

-- One participant per accepted request (each request has one family profile)
CREATE OR REPLACE FUNCTION public.activity_capacity(p_activity_id uuid)
RETURNS TABLE (max_participants integer, taken_places bigint, available_places bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        a.max_participants,
        taken.places,
        CASE WHEN a.max_participants IS NULL THEN NULL
             ELSE a.max_participants - taken.places END
    FROM public.activities a
    CROSS JOIN LATERAL (
        SELECT count(*) AS places
        FROM public.enrolment_requests er
        WHERE er.activity_id = a.id AND er.status = 'accepted'
    ) AS taken
    WHERE a.id = p_activity_id
      AND (a.status = 'published' OR a.provider_id = auth.uid());
$$;
