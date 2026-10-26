-- Activities now have one price instead of a price range.
-- Existing rows keep the lower end of the former range.
ALTER TABLE public.activities
    ADD COLUMN price NUMERIC(8, 2);

UPDATE public.activities
SET price = price_min;

ALTER TABLE public.activities
    ALTER COLUMN price SET NOT NULL,
    ADD CONSTRAINT activity_price_is_valid CHECK (price >= 0),
    DROP CONSTRAINT activity_price_range_is_valid,
    DROP COLUMN price_min,
    DROP COLUMN price_max;

GRANT UPDATE (price)
ON public.activities
TO authenticated;
