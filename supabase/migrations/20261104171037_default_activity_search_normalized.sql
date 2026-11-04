-- The refresh_activity_search trigger always fills search_normalized, so the app
-- must not send it. Without a default the column is NOT NULL with no value, and
-- the generated types force every insert to include it.
ALTER TABLE public.activities
    ALTER COLUMN search_normalized SET DEFAULT '';
