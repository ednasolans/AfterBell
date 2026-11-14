-- #119: places of the provider's activities, and a maximum that cannot go
-- below the participants already accepted.

-- The places of every activity of the logged-in provider, in one call: the
-- counters of "My activities" and the activity filter of the requests use it.
-- max_participants and available_places are NULL when there is no limit.
CREATE FUNCTION public.provider_activity_capacities()
RETURNS TABLE (
    activity_id uuid,
    activity_title text,
    max_participants integer,
    taken_places bigint,
    available_places bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        a.id,
        a.title,
        a.max_participants,
        taken.places,
        CASE WHEN a.max_participants IS NULL THEN NULL
             ELSE greatest(0, a.max_participants - taken.places) END
    FROM public.activities a
    CROSS JOIN LATERAL (
        SELECT count(*) AS places
        FROM public.enrolment_requests er
        WHERE er.activity_id = a.id AND er.status = 'accepted'
    ) AS taken
    WHERE a.provider_id = auth.uid()
    ORDER BY a.title, a.id;
$$;

REVOKE ALL ON FUNCTION public.provider_activity_capacities()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provider_activity_capacities() TO authenticated;

-- The maximum cannot go below the accepted participants (team decision).
-- accept_enrolment_request locks the activity row, and so does this UPDATE,
-- so an acceptance and a change of the maximum cannot cross each other.
CREATE FUNCTION public.check_participant_limit_above_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_accepted bigint;
BEGIN
    -- UPDATE OF fires even when the value does not change
    IF NEW.max_participants IS NULL
       OR NEW.max_participants IS NOT DISTINCT FROM OLD.max_participants THEN
        RETURN NEW;
    END IF;

    SELECT count(*) INTO v_accepted
    FROM public.enrolment_requests
    WHERE activity_id = NEW.id AND status = 'accepted';

    IF NEW.max_participants < v_accepted THEN
        RAISE EXCEPTION 'There are already % accepted participants', v_accepted
            USING ERRCODE = 'check_violation',
                  HINT = 'The maximum cannot be lower than the accepted participants.';
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_participant_limit_above_accepted()
    FROM PUBLIC, anon, authenticated;

CREATE TRIGGER activities_participant_limit_above_accepted
    BEFORE UPDATE OF max_participants ON public.activities
    FOR EACH ROW
    EXECUTE FUNCTION public.check_participant_limit_above_accepted();
