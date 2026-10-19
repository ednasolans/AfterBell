-- ============================================================
-- AfterBell - Issue #32
-- Target ages, schedule and prices now belong to each activity,
-- so they are removed from the technical sheet to avoid duplicated data.
-- ============================================================

ALTER TABLE public.technical_sheets
    DROP CONSTRAINT price_range_is_valid,
    DROP COLUMN target_age_ranges,
    DROP COLUMN schedule,
    DROP COLUMN price_min,
    DROP COLUMN price_max,
    DROP COLUMN price_period;