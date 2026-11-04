-- #76: rules for the dates of temporary activities.
-- A CHECK cannot use current_date (it is not immutable), and a CHECK violation
-- only returns the name of the constraint, so the rules live in a trigger that
-- raises one clear message for each case.

CREATE FUNCTION public.validate_activity_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NEW.type = 'whole_year'
       AND (NEW.start_date IS NOT NULL OR NEW.end_date IS NOT NULL) THEN
        RAISE EXCEPTION 'Whole-year activities cannot have dates'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.type <> 'temporary' THEN
        RETURN NEW;
    END IF;

    IF NEW.start_date IS NULL OR NEW.end_date IS NULL THEN
        RAISE EXCEPTION 'Temporary activities require a start date and an end date'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.end_date < NEW.start_date THEN
        RAISE EXCEPTION 'The end date cannot be before the start date'
            USING ERRCODE = '23514';
    END IF;

    -- Only when the start date is being set: a provider must still be able to
    -- edit an activity that has already started, e.g. to extend its end date.
    IF NEW.start_date < current_date
       AND (
           TG_OP = 'INSERT'
           OR NEW.start_date IS DISTINCT FROM OLD.start_date
           OR NEW.type IS DISTINCT FROM OLD.type
       ) THEN
        RAISE EXCEPTION 'The start date cannot be in the past'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER activities_validate_dates
BEFORE INSERT OR UPDATE OF type, start_date, end_date
ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.validate_activity_dates();

REVOKE ALL ON FUNCTION public.validate_activity_dates()
FROM PUBLIC, anon, authenticated;

-- The guarantee stays in the table too, whatever happens to the trigger.
-- No cleanup first: if a row breaks the rule the migration fails instead of
-- silently deleting its dates.
ALTER TABLE public.activities
    ADD CONSTRAINT activities_whole_year_no_dates CHECK (
        type <> 'whole_year' OR (start_date IS NULL AND end_date IS NULL)
    );
