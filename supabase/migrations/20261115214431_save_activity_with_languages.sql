-- Save the activity and its language pairs in one transaction under existing RLS.
CREATE FUNCTION public.save_activity_with_languages(
    p_activity jsonb,
    p_languages jsonb,
    p_activity_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    details public.activities := jsonb_populate_record(NULL::public.activities, p_activity);
    saved_id uuid := p_activity_id;
    activity_status text;
BEGIN
    IF saved_id IS NULL THEN
        INSERT INTO public.activities (
            title, description, category, is_tutor, type, start_date, end_date,
            target_age_ranges, schedule, price, price_period, max_participants,
            unlimited_participants, address_id
        ) VALUES (
            details.title, details.description, details.category, details.is_tutor,
            details.type, details.start_date, details.end_date, details.target_age_ranges,
            details.schedule, details.price, details.price_period, details.max_participants,
            COALESCE(details.unlimited_participants, false), details.address_id
        )
        RETURNING id INTO saved_id;
    ELSE
        -- Serialize saves and publication changes for this activity.
        SELECT a.status INTO activity_status
        FROM public.activities a
        WHERE a.id = saved_id AND a.provider_id = (SELECT auth.uid())
        FOR NO KEY UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'The activity does not exist or you cannot edit it';
        END IF;
    END IF;

    -- Preserve saved pairs if the provider temporarily changes category.
    IF details.category = 'language' THEN
        DELETE FROM public.languages l
        WHERE l.activity_id = saved_id
          AND NOT EXISTS (
              SELECT 1 FROM jsonb_to_recordset(p_languages) AS pair(language text, level text)
              WHERE l.language = btrim(pair.language) AND l.level = btrim(pair.level)
          );

        INSERT INTO public.languages (activity_id, language, level)
        SELECT saved_id, btrim(pair.language), btrim(pair.level)
        FROM jsonb_to_recordset(p_languages) AS pair(language text, level text)
        ON CONFLICT ON CONSTRAINT languages_activity_id_language_level_key DO NOTHING;
    END IF;

    IF p_activity_id IS NOT NULL THEN
        -- The publication trigger sees the new pairs when validating a category change.
        UPDATE public.activities a SET
            title = details.title,
            description = details.description,
            category = details.category,
            is_tutor = details.is_tutor,
            type = details.type,
            start_date = details.start_date,
            end_date = details.end_date,
            target_age_ranges = details.target_age_ranges,
            schedule = details.schedule,
            price = details.price,
            price_period = details.price_period,
            max_participants = details.max_participants,
            unlimited_participants = COALESCE(details.unlimited_participants, false),
            address_id = details.address_id
        WHERE a.id = saved_id;

        -- The publication trigger skips an edit when only the pairs changed.
        IF activity_status = 'published' AND details.category = 'language'
           AND NOT EXISTS (
               SELECT 1 FROM public.languages l
               WHERE l.activity_id = saved_id
           ) THEN
            RAISE EXCEPTION 'Add at least one language and level to a published language activity'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN saved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_activity_with_languages(jsonb, jsonb, uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_activity_with_languages(jsonb, jsonb, uuid)
TO authenticated;
