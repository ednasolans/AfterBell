-- ============================================================
-- AfterBell - Issue #32
-- The schedule of an activity was only checked to be a non-empty
-- JSON array. Now the database also checks every time slot, with
-- the same rules as the app (mobile/src/lib/schedule.ts):
--   { "day": <week day>, "startTime": "HH:MM", "endTime": "HH:MM" }
--   exactly these three keys, and startTime before endTime.
-- ============================================================


-- ============================================================
-- 1. VALIDATION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_valid_schedule(schedule JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE

    slot JSONB;

BEGIN

    IF jsonb_typeof(schedule) IS DISTINCT FROM 'array'
       OR jsonb_array_length(schedule) = 0 THEN
        RETURN FALSE;
    END IF;

    FOR slot IN SELECT value FROM jsonb_array_elements(schedule) LOOP

        -- Each slot is an object (checked first: the next checks need an object)
        IF jsonb_typeof(slot) <> 'object' THEN
            RETURN FALSE;
        END IF;

        -- Exactly the keys day, startTime and endTime, all of them text
        IF NOT (slot ?& ARRAY['day', 'startTime', 'endTime'])
           OR (SELECT count(*) FROM jsonb_object_keys(slot)) <> 3
           OR jsonb_typeof(slot -> 'day') <> 'string'
           OR jsonb_typeof(slot -> 'startTime') <> 'string'
           OR jsonb_typeof(slot -> 'endTime') <> 'string' THEN
            RETURN FALSE;
        END IF;

        IF (slot ->> 'day') NOT IN (
            'monday', 'tuesday', 'wednesday', 'thursday',
            'friday', 'saturday', 'sunday'
        ) THEN
            RETURN FALSE;
        END IF;

        -- 24-hour "HH:MM" times, same pattern as the app
        IF (slot ->> 'startTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
           OR (slot ->> 'endTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
            RETURN FALSE;
        END IF;

        IF (slot ->> 'startTime')::TIME >= (slot ->> 'endTime')::TIME THEN
            RETURN FALSE;
        END IF;

    END LOOP;

    RETURN TRUE;

END;
$$;


-- ============================================================
-- 2. FUNCTION PERMISSIONS
-- ============================================================

-- Logged-in users need it because the CHECK runs when they write activities
REVOKE ALL
ON FUNCTION public.is_valid_schedule(JSONB)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_valid_schedule(JSONB)
TO authenticated;


-- ============================================================
-- 3. CONSTRAINT
-- ============================================================

-- Replaces the previous check (non-empty JSON array), which the function also covers
ALTER TABLE public.activities
    DROP CONSTRAINT activities_schedule_check,
    ADD CONSTRAINT activity_schedule_is_valid
        CHECK (public.is_valid_schedule(schedule));