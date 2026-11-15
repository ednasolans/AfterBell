-- Run against the local database after applying the C5.1 and C5.2 migrations.
BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
    ('e5200000-0000-0000-0000-000000000001', 'c52-owner@test.com',
     '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('e5200000-0000-0000-0000-000000000002', 'c52-other@test.com',
     '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('e5200000-0000-0000-0000-000000000003', 'c52-customer@test.com',
     '{"account_type":"customer"}', 'authenticated', 'authenticated');

INSERT INTO public.addresses (id, provider_id, street, number, postal_code, city, province, country)
VALUES ('f5200000-0000-0000-0000-000000000001', 'e5200000-0000-0000-0000-000000000001',
        'C/ Major', '1', '25001', 'Lleida', 'Lleida', 'Spain');

INSERT INTO public.technical_sheets (provider_id, name, provider_type, activity_types, address_id, email)
VALUES ('e5200000-0000-0000-0000-000000000001', 'Language school', 'sports_club', '{language}',
        'f5200000-0000-0000-0000-000000000001', 'c52-school@test.com');

SET LOCAL request.jwt.claims = '{"sub":"e5200000-0000-0000-0000-000000000001","role":"authenticated"}';
SET LOCAL ROLE authenticated;

DO $$
DECLARE
    form jsonb := '{
        "title":"Language lesson",
        "category":"language",
        "is_tutor":true,
        "type":"whole_year",
        "target_age_ranges":["7-9"],
        "schedule":[{"day":"monday","startTime":"17:00","endTime":"18:00"}],
        "price":20,
        "price_period":"per_month",
        "max_participants":12,
        "address_id":"f5200000-0000-0000-0000-000000000001"
    }';
    saved_id uuid;
    pairs jsonb := '[{"language":"English","level":"B1"},{"language":"Catalan","level":"C1"}]';
BEGIN
    BEGIN
        PERFORM public.save_activity_with_languages(form || '{"title":"Invalid lesson"}',
            '[{"language":" ","level":"B1"}]');
        RAISE EXCEPTION 'Expected an empty language to be rejected';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;
    IF EXISTS (SELECT 1 FROM public.activities WHERE title = 'Invalid lesson') THEN
        RAISE EXCEPTION 'The failed creation left an activity behind';
    END IF;

    saved_id := public.save_activity_with_languages(form, '[]');
    PERFORM set_config('afterbell.test_activity_id', saved_id::text, true);

    IF NOT EXISTS (
        SELECT 1 FROM public.activities WHERE id = saved_id AND status = 'draft' AND is_tutor
    ) OR public.activity_publication_issues(saved_id) IS DISTINCT FROM ARRAY['language'] THEN
        RAISE EXCEPTION 'Expected a tutoring draft with a missing language pair';
    END IF;

    PERFORM public.save_activity_with_languages(form || '{"category":"football"}', '[]', saved_id);
    UPDATE public.activities SET status = 'published' WHERE id = saved_id;

    -- Changing a published activity to Language checks the new pairs.
    PERFORM public.save_activity_with_languages(form, pairs, saved_id);
    IF (SELECT count(*) FROM public.languages WHERE activity_id = saved_id) <> 2 THEN
        RAISE EXCEPTION 'Expected both language pairs to be saved';
    END IF;

    PERFORM public.save_activity_with_languages(form || '{"category":"football"}', '[]', saved_id);
    IF (SELECT count(*) FROM public.languages WHERE activity_id = saved_id) <> 2 THEN
        RAISE EXCEPTION 'Changing category should preserve saved pairs';
    END IF;

    pairs := '[{"language":"English","level":" B2 "}]';
    PERFORM public.save_activity_with_languages(form, pairs, saved_id);

    BEGIN
        PERFORM public.save_activity_with_languages(form || '{"title":"Removed pairs"}', '[]', saved_id);
        RAISE EXCEPTION 'Expected removal of the last pair to be rejected';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    BEGIN
        PERFORM public.save_activity_with_languages(form,
            '[{"language":"English","level":" "}]', saved_id);
        RAISE EXCEPTION 'Expected an empty level to be rejected';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    IF (SELECT title FROM public.activities WHERE id = saved_id) <> 'Language lesson'
       OR (SELECT jsonb_agg(jsonb_build_object('language', language, 'level', level))
           FROM public.languages WHERE activity_id = saved_id)
           IS DISTINCT FROM '[{"language":"English","level":"B2"}]'::jsonb THEN
        RAISE EXCEPTION 'Expected the replacement pair and activity to survive failed edits';
    END IF;
END;
$$;

SET LOCAL request.jwt.claims = '{"sub":"e5200000-0000-0000-0000-000000000002","role":"authenticated"}';
DO $$
BEGIN
    BEGIN
        PERFORM public.save_activity_with_languages('{"category":"language"}', '[]',
            current_setting('afterbell.test_activity_id')::uuid);
        RAISE EXCEPTION 'Expected editing by another provider to be denied';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'The activity does not exist or you cannot edit it' THEN
            RAISE;
        END IF;
    END;
END;
$$;

SET LOCAL request.jwt.claims = '{"sub":"e5200000-0000-0000-0000-000000000003","role":"authenticated"}';
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.languages
        WHERE activity_id = current_setting('afterbell.test_activity_id')::uuid
          AND language = 'English' AND level = 'B2'
    ) THEN
        RAISE EXCEPTION 'Customers should read pairs for published activities';
    END IF;
END;
$$;

SET LOCAL request.jwt.claims = '{"sub":"e5200000-0000-0000-0000-000000000001","role":"authenticated"}';
UPDATE public.activities SET status = 'draft'
WHERE id = current_setting('afterbell.test_activity_id')::uuid;

SET LOCAL request.jwt.claims = '{"sub":"e5200000-0000-0000-0000-000000000003","role":"authenticated"}';
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.languages
        WHERE activity_id = current_setting('afterbell.test_activity_id')::uuid
    ) THEN
        RAISE EXCEPTION 'Customers should not read draft pairs';
    END IF;
END;
$$;

ROLLBACK;
