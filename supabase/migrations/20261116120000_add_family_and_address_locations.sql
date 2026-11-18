-- #139: locations for recommendations by distance (C7 uses them).
-- Activities get the exact point of their address, which is public data.
-- Families get their city and an approximate point: a family profile is about
-- minors, so the database never keeps a position more precise than 1-2 km.

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Point of the address where activities take place, found by geocoding the
-- address in the app. Optional: older addresses, or addresses that could not
-- be geocoded, have no point and can still be compared by city.
ALTER TABLE public.addresses
    ADD COLUMN location extensions.geography(Point, 4326);

CREATE INDEX addresses_location_idx ON public.addresses USING gist (location);

GRANT INSERT (location), UPDATE (location) ON TABLE public.addresses TO authenticated;

-- Where the family lives: one place per family group, shared by its members.
ALTER TABLE public.family_groups
    ADD COLUMN city text,
    ADD COLUMN location extensions.geography(Point, 4326),
    ADD CONSTRAINT family_groups_city_check
        CHECK (city IS NULL OR (btrim(city) <> '' AND char_length(city) <= 100)),
    -- The point is only meaningful together with its city
    ADD CONSTRAINT family_groups_location_has_city
        CHECK (location IS NULL OR city IS NOT NULL);

-- Size of the grid used to blur the position of a family, in degrees.
-- 0.015 degrees is about 1.7 km north-south and 1.3 km east-west in Spain.
CREATE FUNCTION public.family_location_grid()
RETURNS double precision
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$ SELECT 0.015::double precision $$;

-- Saves the city and the approximate position of the caller's family. The
-- members can only read family_groups, so this is the only way to change it.
-- The point is moved to the centre of its grid cell before it is stored.
CREATE FUNCTION public.set_family_location(
    p_city text,
    p_latitude double precision,
    p_longitude double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_group uuid;
    v_city text := btrim(p_city);
    v_grid double precision := public.family_location_grid();
BEGIN
    SELECT m.family_group_id INTO v_group
    FROM public.family_group_members m
    WHERE m.account_id = auth.uid();
    IF v_group IS NULL THEN
        RAISE EXCEPTION 'Only family accounts can save a location';
    END IF;

    IF v_city IS NULL OR v_city = '' THEN
        RAISE EXCEPTION 'Enter your city or town';
    END IF;
    IF char_length(v_city) > 100 THEN
        RAISE EXCEPTION 'The city name is too long';
    END IF;
    IF p_latitude IS NULL OR p_longitude IS NULL
       OR p_latitude NOT BETWEEN -90 AND 90
       OR p_longitude NOT BETWEEN -180 AND 180 THEN
        RAISE EXCEPTION 'The location is not valid';
    END IF;

    UPDATE public.family_groups
    SET city = v_city,
        location = extensions.ST_SetSRID(
            extensions.ST_MakePoint(
                round(p_longitude / v_grid) * v_grid,
                round(p_latitude / v_grid) * v_grid
            ),
            4326
        )::extensions.geography
    WHERE id = v_group;
END;
$$;

REVOKE ALL ON FUNCTION public.set_family_location(text, double precision, double precision)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_family_location(text, double precision, double precision)
    TO authenticated;
