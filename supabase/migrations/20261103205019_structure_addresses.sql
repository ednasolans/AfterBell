-- C11 / #129. Preserve old address text as street (not an inferred street number).
-- Legacy rows will have NULL in fields that cannot be inferred reliably.
ALTER TABLE public.addresses
    ADD COLUMN street text,
    ADD COLUMN number text,
    ADD COLUMN floor text,
    ADD COLUMN door text,
    ADD COLUMN postal_code text,
    ADD COLUMN province text,
    ADD COLUMN country text;
UPDATE public.addresses SET street = address, country = 'Spain';
ALTER TABLE public.addresses ALTER COLUMN address DROP NOT NULL;
ALTER TABLE public.addresses
    ADD CONSTRAINT addresses_street_nonempty CHECK (street IS NULL OR btrim(street) <> ''),
    ADD CONSTRAINT addresses_number_nonempty CHECK (number IS NULL OR btrim(number) <> ''),
    ADD CONSTRAINT addresses_postal_nonempty CHECK (postal_code IS NULL OR btrim(postal_code) <> ''),
    ADD CONSTRAINT addresses_province_nonempty CHECK (province IS NULL OR btrim(province) <> ''),
    ADD CONSTRAINT addresses_country_nonempty CHECK (country IS NULL OR btrim(country) <> '');
CREATE INDEX addresses_postal_code_idx ON public.addresses(postal_code);
CREATE INDEX addresses_city_idx ON public.addresses(city);
GRANT UPDATE (street, number, floor, door, postal_code, city, province, country)
    ON public.addresses TO authenticated;
-- New rows must be fully structured; legacy rows can be completed later.
CREATE FUNCTION public.require_structured_address_on_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF NEW.street IS NULL OR NEW.number IS NULL OR NEW.postal_code IS NULL
       OR NEW.province IS NULL OR NEW.country IS NULL THEN
       RAISE EXCEPTION 'Street, number, postal code, province and country are required' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END; $$;
CREATE TRIGGER require_structured_address_on_insert
    BEFORE INSERT ON public.addresses FOR EACH ROW
    EXECUTE FUNCTION public.require_structured_address_on_insert();
REVOKE ALL ON FUNCTION public.require_structured_address_on_insert() FROM PUBLIC, anon, authenticated;
-- No DROP COLUMN address here: leave the old value available until mobile forms and
-- all existing rows have been converted. See cleanup step in README.
