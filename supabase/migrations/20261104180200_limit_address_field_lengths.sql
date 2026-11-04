-- The structured address columns were added without a length limit. Every
-- free-text column needs one, and the form uses the same limits
-- (mobile/src/lib/addresses.ts).
ALTER TABLE public.addresses
    ADD CONSTRAINT addresses_street_length CHECK (char_length(street) <= 200),
    ADD CONSTRAINT addresses_number_length CHECK (char_length(number) <= 20),
    ADD CONSTRAINT addresses_floor_length CHECK (char_length(floor) <= 20),
    ADD CONSTRAINT addresses_door_length CHECK (char_length(door) <= 20),
    ADD CONSTRAINT addresses_postal_code_length CHECK (char_length(postal_code) <= 20),
    ADD CONSTRAINT addresses_province_length CHECK (char_length(province) <= 100),
    ADD CONSTRAINT addresses_country_length CHECK (char_length(country) <= 100);
