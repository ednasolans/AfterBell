-- #117: an activity can have no limit of participants, but only on purpose.
-- max_participants is empty only when unlimited_participants is true. The flag
-- defaults to false, so an insert that forgets the maximum is rejected instead
-- of becoming "no limit" by accident. Existing activities keep their limit.

ALTER TABLE public.activities
    ADD COLUMN unlimited_participants BOOLEAN NOT NULL DEFAULT false,
    ALTER COLUMN max_participants DROP NOT NULL,
    ADD CONSTRAINT activities_participant_limit_is_explicit CHECK (
        (unlimited_participants AND max_participants IS NULL)
        OR (NOT unlimited_participants AND max_participants IS NOT NULL)
    );

GRANT UPDATE (unlimited_participants)
ON TABLE public.activities
TO authenticated;
