#!/usr/bin/env bash
# #107: integration test of the recommendations Edge Function with real sessions
# (login, JWT, RLS and the SQL function). It creates its own data, commits it
# (the function runs in another connection) and deletes it at the end.
#   npx supabase start
#   npx supabase functions serve --env-file supabase/functions/.env   (other terminal)
#   bash supabase/tests/recommendations_endpoint.sh
# Every line must start with "ok".
set -uo pipefail

DB=(docker exec -i supabase_db_AfterBell psql -U postgres -d postgres -qAt -v ON_ERROR_STOP=1)
API=${API_URL:-http://127.0.0.1:54321}
# The publishable key is public: it is the one the app uses
KEY=${PUBLISHABLE_KEY:-$(npx supabase status -o env 2>/dev/null | sed -n 's/^PUBLISHABLE_KEY="\(.*\)"/\1/p')}
[ -n "$KEY" ] || { echo "FAIL could not read the publishable key (is Supabase running?)"; exit 1; }
PASSWORD='Test-password-107'
failures=0

cleanup() {
  "${DB[@]}" >/dev/null <<SQL
BEGIN;
ALTER TABLE public.family_profiles DISABLE TRIGGER protect_main_family_profile_before_delete;
DELETE FROM public.family_groups WHERE id IN (
  SELECT family_group_id FROM public.family_group_members m
  JOIN public.accounts a ON a.id = m.account_id WHERE a.email LIKE 'ep-%@test.com');
ALTER TABLE public.family_profiles ENABLE TRIGGER protect_main_family_profile_before_delete;
DELETE FROM auth.users WHERE email LIKE 'ep-%@test.com';
COMMIT;
SQL
}
trap cleanup EXIT
cleanup

check() { # name actual expected
  if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FAIL $1: got '$2', expected '$3'"; failures=$((failures + 1)); fi
}

# ---- data -------------------------------------------------------------------
# club: provider with an approved profile. f1: Lleida, Marc (8, football) and
# Laia (8, art). f2: another family, Pol (8, music). f3: no city. f4: no
# profiles. f5: a profile without interests. f6: Girona (nothing there).
CLUB=e1070000-0000-0000-0000-00000000000a
# Users are created through the Auth API, so they can log in with a password.
# The secret key is only read from the local stack, never written anywhere.
SECRET=${SECRET_KEY:-$(npx supabase status -o env 2>/dev/null | sed -n 's/^SECRET_KEY="\(.*\)"/\1/p')}
create_user() { # id email account_type
  curl -s -o /dev/null -w '%{http_code}' "$API/auth/v1/admin/users" -H "apikey: $SECRET" -H "Authorization: Bearer $SECRET" \
    -H 'Content-Type: application/json' \
    -d "{\"id\":\"$1\",\"email\":\"$2\",\"password\":\"$PASSWORD\",\"email_confirm\":true,\"user_metadata\":{\"account_type\":\"$3\"}}"
}
create_user "$CLUB" ep-club@test.com company >/dev/null
for n in 1 2 3 4 5 6; do create_user "e1070000-0000-0000-0000-0000000000f$n" "ep-family-$n@test.com" customer >/dev/null; done

"${DB[@]}" >/dev/null <<SQL

UPDATE public.family_groups g SET city = v.city
FROM (VALUES ('e1070000-0000-0000-0000-0000000000f1', 'Lleida'), ('e1070000-0000-0000-0000-0000000000f2', 'Lleida'),
             ('e1070000-0000-0000-0000-0000000000f4', 'Lleida'), ('e1070000-0000-0000-0000-0000000000f5', 'Lleida'),
             ('e1070000-0000-0000-0000-0000000000f6', 'Girona')) AS v(account, city)
WHERE g.id = (SELECT family_group_id FROM public.family_group_members WHERE account_id = v.account::uuid);

INSERT INTO public.family_profiles (id, family_group_id, first_name, date_of_birth, interests)
SELECT v.id::uuid, m.family_group_id, v.name, v.dob, v.interests
FROM (VALUES
  ('e1070000-0000-0000-0000-0000000000c1', 'e1070000-0000-0000-0000-0000000000f1', 'Marc', current_date - interval '8 years', '{football}'::text[]),
  ('e1070000-0000-0000-0000-0000000000c2', 'e1070000-0000-0000-0000-0000000000f1', 'Laia', current_date - interval '8 years', '{art}'),
  ('e1070000-0000-0000-0000-0000000000c3', 'e1070000-0000-0000-0000-0000000000f2', 'Pol', current_date - interval '8 years', '{music}'),
  ('e1070000-0000-0000-0000-0000000000c5', 'e1070000-0000-0000-0000-0000000000f5', 'Ona', current_date - interval '8 years', '{}'),
  ('e1070000-0000-0000-0000-0000000000c6', 'e1070000-0000-0000-0000-0000000000f6', 'Nil', current_date - interval '8 years', '{football}')
) AS v(id, account, name, dob, interests)
JOIN public.family_group_members m ON m.account_id = v.account::uuid;

INSERT INTO public.provider_profiles (provider_id, headline, description, model, status, approved_at, approved_headline, approved_description)
VALUES ('$CLUB', 'Club', 'Club', 'test', 'approved', now(), 'Club', 'Club');
INSERT INTO public.addresses (id, provider_id, street, number, postal_code, city, province, country)
VALUES ('e1070000-0000-0000-0000-0000000000d1', '$CLUB', 'C/ Major', '1', '25001', 'Lleida', 'Lleida', 'Spain');
INSERT INTO public.technical_sheets (provider_id, name, provider_type, activity_types, address_id, email)
VALUES ('$CLUB', 'Club', 'sports_club', '{football}', 'e1070000-0000-0000-0000-0000000000d1', 'club@test.com');

-- 5 football activities (Marc), 1 art (Laia), 1 music (Pol)
INSERT INTO public.activities (id, provider_id, address_id, title, category, target_age_ranges, schedule,
  price, price_period, max_participants, status, created_at)
SELECT ('e1070000-0000-0000-0000-0000000001' || lpad(v.n::text, 2, '0'))::uuid, '$CLUB',
  'e1070000-0000-0000-0000-0000000000d1', v.title, v.category, '{7-9}',
  '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]'::jsonb, 10, 'per_month', 10, 'published',
  now() - (v.n || ' days')::interval
FROM (VALUES (1, 'Football 1', 'football'), (2, 'Football 2', 'football'), (3, 'Football 3', 'football'),
             (4, 'Football 4', 'football'), (5, 'Football 5', 'football'),
             (6, 'Art 1', 'art'), (7, 'Music 1', 'music')) AS v(n, title, category);
SQL

# ---- helpers ----------------------------------------------------------------
token_of() { # email -> access token
  curl -s "$API/auth/v1/token?grant_type=password" -H "apikey: $KEY" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\"}" | jq -r '.access_token // empty'
}
FAMILY1=$(token_of ep-family-1@test.com); FAMILY2=$(token_of ep-family-2@test.com)
FAMILY3=$(token_of ep-family-3@test.com); FAMILY4=$(token_of ep-family-4@test.com)
FAMILY5=$(token_of ep-family-5@test.com); FAMILY6=$(token_of ep-family-6@test.com)
CLUBTOKEN=$(token_of ep-club@test.com)
[ -n "$FAMILY1" ] && [ -n "$CLUBTOKEN" ] || { echo "FAIL login failed"; exit 1; }

# call TOKEN BODY -> sets STATUS and BODY
call() {
  local auth=()
  [ -n "$1" ] && auth=(-H "Authorization: Bearer $1")
  local out
  out=$(curl -s -w '\n%{http_code}' -X POST "$API/functions/v1/recommendations" -H "apikey: $KEY" ${auth[@]+"${auth[@]}"} \
    -H 'Content-Type: application/json' -d "${2:-}")
  STATUS=$(tail -n 1 <<<"$out"); BODY=$(sed '$d' <<<"$out")
}
field() { jq -r "$1" <<<"$BODY"; }

# ---- authentication and permissions ----------------------------------------
call "" '{}'
check "no session is rejected (401)" "$STATUS" "401"
call "not-a-token" '{}'
check "an invalid token is rejected (401)" "$STATUS" "401"
call "$CLUBTOKEN" '{}'
check "a provider gets 403" "$STATUS" "403"
check "a provider gets the forbidden code" "$(field .error.code)" "forbidden"

# ---- the customer's own recommendations ------------------------------------
call "$FAMILY1" '{}'
check "a customer gets 200" "$STATUS" "200"
check "status OK" "$(field .status)" "OK"
check "Marc's 5 football activities and Laia's art one" "$(field '.activities | length')" "6"
check "each football activity matches Marc only" \
  "$(field '[.activities[] | select(.activity.category == "football") | .matched_profiles[0].first_name] | unique | join(",")')" "Marc"
check "the art activity matches Laia" \
  "$(field '[.activities[] | select(.activity.category == "art") | .matched_profiles[0].first_name] | join(",")')" "Laia"
check "the music activity of family 2 is not shown to family 1" \
  "$(field '[.activities[] | select(.activity.category == "music")] | length')" "0"

call "$FAMILY2" '{}'
check "family 2 only sees its own match (Pol, music)" \
  "$(field '[.activities[] | .activity.category + ":" + .matched_profiles[0].first_name] | join(",")')" "music:Pol"
check "family 2 never gets profiles of family 1" \
  "$(field '[.activities[].matched_profiles[].first_name] | map(select(. == "Marc" or . == "Laia")) | length')" "0"

# ---- pagination -------------------------------------------------------------
call "$FAMILY1" '{"limit":4,"offset":0}'
check "page 1 has 4 items" "$(field '.activities | length')" "4"
check "page 1 has a next page" "$(field .pagination.has_more)" "true"
PAGE1=$(field '[.activities[].activity.id] | join(",")')
call "$FAMILY1" '{"limit":4,"offset":4}'
check "page 2 has the remaining 2 items" "$(field '.activities | length')" "2"
check "page 2 is the last page" "$(field .pagination.has_more)" "false"
PAGE2=$(field '[.activities[].activity.id] | join(",")')
check "pages do not repeat activities" "$(printf '%s,%s' "$PAGE1" "$PAGE2" | tr ',' '\n' | sort -u | wc -l | tr -d ' ')" "6"
call "$FAMILY1" '{"limit":4,"offset":40}'
check "a page after the end is empty and still OK" "$(field '.status + ":" + (.activities | length | tostring)')" "OK:0"

# ---- limit ------------------------------------------------------------------
call "$FAMILY1" '{"limit":1}'
check "limit 1 returns one item" "$(field '.activities | length')" "1"
call "$FAMILY1" '{"limit":40}'
check "the maximum limit (40) is accepted" "$STATUS" "200"
call "$FAMILY1" '{"limit":41}'
check "a limit above the maximum is rejected (400)" "$STATUS" "400"
call "$FAMILY1" '{"limit":0}'
check "limit 0 is rejected (400)" "$STATUS" "400"
call "$FAMILY1" '{"offset":-1}'
check "a negative offset is rejected (400)" "$STATUS" "400"

# ---- missing data and empty result -----------------------------------------
call "$FAMILY3" '{}'
check "a customer without city: status" "$(field .status)" "NO_CITY"
check "a customer without city: empty list" "$(field '.activities | length')" "0"
call "$FAMILY4" '{}'
check "a customer without profiles: status" "$(field .status)" "NO_PROFILES"
call "$FAMILY5" '{}'
check "profiles without interests: status" "$(field .status)" "INCOMPLETE_PROFILES"
call "$FAMILY6" '{}'
check "nothing in the town: 200" "$STATUS" "200"
check "nothing in the town: NO_MATCHES" "$(field .status)" "NO_MATCHES"
check "nothing in the town: empty list" "$(field '.activities | length')" "0"

[ "$failures" -eq 0 ] || { echo "$failures check(s) failed"; exit 1; }
