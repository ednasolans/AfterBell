#!/usr/bin/env bash
# #117: two providers' sessions accept the last place at the same time.
# Needs two real connections, so it cannot run inside one transaction like the
# other tests. It creates its own data, commits it, and deletes it at the end.
#   bash supabase/tests/enrolment_concurrency.sh
# It prints "ok" when only one of the two acceptances succeeds.
set -euo pipefail

DB=(docker exec -i supabase_db_AfterBell psql -U postgres -d postgres -qAt -v ON_ERROR_STOP=1)
PROVIDER=c9100000-0000-0000-0000-00000000000a
ACTIVITY=d9100000-0000-0000-0000-000000000001

cleanup() {
  # The oldest profile of a family cannot be deleted, so its protection is
  # switched off inside this transaction only
  "${DB[@]}" >/dev/null <<SQL
BEGIN;
DELETE FROM public.enrolment_requests WHERE activity_id = '$ACTIVITY';
ALTER TABLE public.family_profiles DISABLE TRIGGER protect_main_family_profile_before_delete;
DELETE FROM public.family_groups WHERE id IN (
  SELECT family_group_id FROM public.family_group_members m
  JOIN public.accounts a ON a.id = m.account_id WHERE a.email LIKE 'race-%@test.com');
ALTER TABLE public.family_profiles ENABLE TRIGGER protect_main_family_profile_before_delete;
DELETE FROM auth.users WHERE email LIKE 'race-%@test.com';
COMMIT;
SQL
}
trap cleanup EXIT
cleanup

"${DB[@]}" >/dev/null <<SQL
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
  ('$PROVIDER', 'race-club@test.com', '{"account_type":"company"}', 'authenticated', 'authenticated'),
  ('c9100000-0000-0000-0000-0000000000f1', 'race-family@test.com', '{"account_type":"customer"}', 'authenticated', 'authenticated');
INSERT INTO public.family_profiles (family_group_id, first_name, age_range)
SELECT family_group_id, n, '7-9' FROM public.family_group_members, (VALUES ('Race one'), ('Race two')) v(n)
WHERE account_id = 'c9100000-0000-0000-0000-0000000000f1';
INSERT INTO public.addresses (id, provider_id, street, number, postal_code, city, province, country)
VALUES ('b9100000-0000-0000-0000-00000000000a', '$PROVIDER', 'C/ Major', '1', '25001', 'Lleida', 'Lleida', 'Spain');
INSERT INTO public.technical_sheets (provider_id, name, provider_type, activity_types, address_id, email)
VALUES ('$PROVIDER', 'Race club', 'sports_club', '{football}', 'b9100000-0000-0000-0000-00000000000a', 'race@test.com');
INSERT INTO public.activities (id, provider_id, address_id, title, category, target_age_ranges, schedule,
  price, price_period, max_participants, status)
VALUES ('$ACTIVITY', '$PROVIDER', 'b9100000-0000-0000-0000-00000000000a', 'Last place', 'football', '{7-9}',
  '[{"day":"monday","startTime":"17:00","endTime":"18:00"}]', 10, 'per_month', 1, 'published');
INSERT INTO public.enrolment_requests (activity_id, customer_id, family_profile_id)
SELECT '$ACTIVITY', 'c9100000-0000-0000-0000-0000000000f1', id
FROM public.family_profiles WHERE first_name IN ('Race one', 'Race two');
SQL

request_of() {
  "${DB[@]}" -c "SELECT er.id FROM public.enrolment_requests er
    JOIN public.family_profiles fp ON fp.id = er.family_profile_id
    WHERE er.activity_id = '$ACTIVITY' AND fp.first_name = '$1'"
}
FIRST=$(request_of 'Race one')
SECOND=$(request_of 'Race two')

# Each session accepts one request and keeps its transaction open for a moment,
# so the second one starts while the first has not committed yet.
accept() {
  "${DB[@]}" <<SQL 2>&1 | grep -v -E '^(t|f|)$' || true
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub":"$PROVIDER","role":"authenticated"}', true) IS NULL;
SET LOCAL ROLE authenticated;
SELECT public.accept_enrolment_request('$1');
SELECT pg_sleep(2);
COMMIT;
SQL
}

accept "$FIRST" > /dev/null &
sleep 0.5
second=$(accept "$SECOND")
wait

accepted=$("${DB[@]}" -c "SELECT count(*) FROM public.enrolment_requests WHERE activity_id = '$ACTIVITY' AND status = 'accepted'")
if [ "$accepted" = "1" ] && grep -q 'There are no places left in this activity' <<<"$second"; then
  echo "ok   only one of two simultaneous acceptances gets the last place"
else
  echo "FAIL accepted=$accepted second session: $second"
  exit 1
fi
