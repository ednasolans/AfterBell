-- #86: category catalogue. A category added with one INSERT works everywhere,

BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'categories-club@test.com',
     '{"account_type":"company"}', 'authenticated', 'authenticated'),
    ('c0000000-0000-0000-0000-000000000002', 'categories-family@test.com',
     '{"account_type":"customer"}', 'authenticated', 'authenticated');

INSERT INTO public.addresses (id, provider_id, street, number, postal_code, city, province, country)
VALUES ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
        'C/ Major', '1', '25001', 'Lleida', 'Lleida', 'Spain');

-- Runs a statement and prints "ok" if it fails with the expected message,
-- or if it succeeds when no message is expected
CREATE FUNCTION pg_temp.expect(p_name text, p_sql text, p_message text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
    EXECUTE p_sql;
    IF p_message IS NULL THEN RETURN 'ok   ' || p_name; END IF;
    RETURN 'FAIL ' || p_name || ': no error';
EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = p_message THEN RETURN 'ok   ' || p_name; END IF;
    RETURN 'FAIL ' || p_name || ': ' || SQLERRM;
END;
$$;

-- Inserts one draft activity of the club with the given category
CREATE FUNCTION pg_temp.new_activity(p_category text)
RETURNS uuid LANGUAGE sql AS $$
    INSERT INTO public.activities (
        address_id, title, category, target_age_ranges, schedule,
        price, price_period, max_participants
    ) VALUES (
        'd0000000-0000-0000-0000-000000000001', 'Club activity', p_category, '{7-9}',
        '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]',
        20, 'per_month', 12
    ) RETURNING id;
$$;

GRANT EXECUTE ON FUNCTION pg_temp.expect(text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION pg_temp.new_activity(text) TO authenticated;

\pset tuples_only on
\pset format unaligned

-- Catalogue

SELECT pg_temp.expect('the 11 initial categories exist',
    $q$DO $b$ BEGIN
        IF (SELECT count(*) FROM public.categories) < 11 THEN
            RAISE EXCEPTION 'missing categories';
        END IF;
    END $b$$q$);

SELECT pg_temp.expect('existing activities all have a catalogue category',
    $q$DO $b$ BEGIN
        IF EXISTS (SELECT 1 FROM public.activities a
                   LEFT JOIN public.categories c ON c.name = a.category
                   WHERE c.name IS NULL) THEN
            RAISE EXCEPTION 'activity without a valid category';
        END IF;
    END $b$$q$);

SELECT pg_temp.expect('a category needs a valid type',
    $q$INSERT INTO public.categories (name, category_type) VALUES ('chess', 'online')$q$,
    'new row for relation "categories" violates check constraint "categories_category_type_check"');

-- A new category, added as a migration would do it
INSERT INTO public.categories (name, category_type) VALUES ('chess', 'individual');

SELECT pg_temp.expect('a category in use cannot be renamed',
    $q$UPDATE public.categories SET name = 'board_games' WHERE name = 'football'$q$,
    'Category names are immutable; add new categories in a migration');

SELECT pg_temp.expect('a category cannot be deleted',
    $q$DELETE FROM public.categories WHERE name = 'chess'$q$,
    'Category names are immutable; add new categories in a migration');

-- Provider: activities and technical sheets use the catalogue

SET LOCAL request.jwt.claims = '{"sub":"c0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT pg_temp.expect('a provider reads the catalogue',
    $q$DO $b$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'chess') THEN
            RAISE EXCEPTION 'chess not visible';
        END IF;
    END $b$$q$);

SELECT pg_temp.expect('an activity can use a new category at once',
    $q$SELECT pg_temp.new_activity('chess')$q$);

SELECT pg_temp.expect('an activity with an unknown category is rejected',
    $q$SELECT pg_temp.new_activity('quidditch')$q$,
    'insert or update on table "activities" violates foreign key constraint "activities_category_fkey"');

SELECT pg_temp.expect('an activity cannot change to an unknown category',
    $q$UPDATE public.activities SET category = 'quidditch' WHERE category = 'chess'$q$,
    'insert or update on table "activities" violates foreign key constraint "activities_category_fkey"');

SELECT pg_temp.expect('a technical sheet can use a new category',
    $q$INSERT INTO public.technical_sheets (name, provider_type, activity_types, address_id, email)
       VALUES ('Club', 'sports_club', '{football,chess}',
               'd0000000-0000-0000-0000-000000000001', 'club@test.com')$q$);

SELECT pg_temp.expect('a technical sheet with an unknown category is rejected',
    $q$UPDATE public.technical_sheets SET activity_types = '{football,quidditch}'$q$,
    'Unknown category in technical_sheets');

SELECT pg_temp.expect('a provider cannot add categories',
    $q$INSERT INTO public.categories (name, category_type) VALUES ('hacked', 'individual')$q$,
    'permission denied for table categories');

SELECT pg_temp.expect('a provider cannot change categories',
    $q$UPDATE public.categories SET category_type = 'collective' WHERE name = 'chess'$q$,
    'permission denied for table categories');

SELECT pg_temp.expect('a provider cannot delete categories',
    $q$DELETE FROM public.categories WHERE name = 'other'$q$,
    'permission denied for table categories');

RESET ROLE;

-- Customer: interests use the catalogue

SET LOCAL request.jwt.claims = '{"sub":"c0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT pg_temp.expect('a customer reads the catalogue',
    $q$DO $b$ BEGIN
        IF (SELECT count(*) FROM public.categories) < 12 THEN
            RAISE EXCEPTION 'catalogue not visible';
        END IF;
    END $b$$q$);

SELECT pg_temp.expect('a family profile can use a new category as interest',
    $q$INSERT INTO public.family_profiles (family_group_id, first_name, age_range, interests)
       SELECT family_group_id, 'Nil', '7-9', '{chess,music}'
       FROM public.family_group_members
       WHERE account_id = 'c0000000-0000-0000-0000-000000000002'$q$);

SELECT pg_temp.expect('an unknown interest is rejected',
    $q$UPDATE public.family_profiles SET interests = '{music,quidditch}' WHERE first_name = 'Nil'$q$,
    'Unknown category in family_profiles');

RESET ROLE;

-- Without a session

SET LOCAL ROLE anon;

SELECT pg_temp.expect('anonymous users cannot read the catalogue',
    $q$SELECT 1 FROM public.categories$q$,
    'permission denied for table categories');

RESET ROLE;

ROLLBACK;