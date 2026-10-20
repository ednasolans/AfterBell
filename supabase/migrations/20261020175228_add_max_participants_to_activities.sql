-- ============================================================
-- AfterBell - Issue #32
-- Maximum number of participants per activity.
-- The number of enrolled people will be computed from the
-- enrollments table when it exists, not stored here.
-- ============================================================

ALTER TABLE public.activities
    ADD COLUMN max_participants INTEGER NOT NULL
        CHECK (max_participants BETWEEN 1 AND 1000);

-- Providers can change it when editing their activities
GRANT UPDATE (max_participants)
ON TABLE public.activities
TO authenticated;