-- C11. Five remaining tables (categories created in 01).
CREATE TABLE public.languages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
 language text NOT NULL CHECK(btrim(language) <> ''),
 level text NOT NULL CHECK(btrim(level) <> ''),
 UNIQUE(activity_id, language, level)
);
CREATE INDEX languages_activity_idx ON public.languages(activity_id);
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read languages of visible activities" ON public.languages FOR SELECT TO authenticated
 USING (EXISTS(SELECT 1 FROM public.activities a WHERE a.id=activity_id));
CREATE POLICY "Owners insert languages" ON public.languages FOR INSERT TO authenticated
 WITH CHECK(EXISTS(SELECT 1 FROM public.activities a WHERE a.id=activity_id AND a.provider_id=(SELECT auth.uid())));
CREATE POLICY "Owners edit languages" ON public.languages FOR UPDATE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.activities a WHERE a.id=activity_id AND a.provider_id=(SELECT auth.uid())))
 WITH CHECK(EXISTS(SELECT 1 FROM public.activities a WHERE a.id=activity_id AND a.provider_id=(SELECT auth.uid())));
CREATE POLICY "Owners delete languages" ON public.languages FOR DELETE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.activities a WHERE a.id=activity_id AND a.provider_id=(SELECT auth.uid())));
REVOKE ALL ON public.languages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.languages TO authenticated;
GRANT UPDATE(language,level) ON public.languages TO authenticated;

CREATE TABLE public.favourites (
 customer_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
 activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(customer_id,activity_id)
);
CREATE INDEX favourites_activity_idx ON public.favourites(activity_id);
ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read favourites" ON public.favourites FOR SELECT TO authenticated
 USING(customer_id=(SELECT auth.uid()));
CREATE POLICY "Owners insert favourites" ON public.favourites FOR INSERT TO authenticated
 WITH CHECK(customer_id=(SELECT auth.uid()) AND EXISTS(
    SELECT 1 FROM public.accounts a WHERE a.id=customer_id AND a.account_type='customer'
  ) AND EXISTS(SELECT 1 FROM public.activities a WHERE a.id=activity_id AND a.status='published'));
CREATE POLICY "Owners delete favourites" ON public.favourites FOR DELETE TO authenticated
 USING(customer_id=(SELECT auth.uid()));
REVOKE ALL ON public.favourites FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.favourites TO authenticated;

CREATE TABLE public.enrolment_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
 family_profile_id uuid NOT NULL REFERENCES public.family_profiles(id),
 message text CHECK (message IS NULL OR char_length(message)<=1000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX enrolment_active_unique ON public.enrolment_requests(activity_id, family_profile_id)
 WHERE status IN ('pending','accepted');
CREATE INDEX enrolment_by_activity_status_idx ON public.enrolment_requests(activity_id,status);
CREATE INDEX enrolment_by_customer_idx ON public.enrolment_requests(customer_id);
CREATE INDEX enrolment_by_profile_idx ON public.enrolment_requests(family_profile_id);
CREATE TRIGGER enrolment_touch_updated_at BEFORE UPDATE ON public.enrolment_requests
 FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE public.enrolment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer or provider reads requests" ON public.enrolment_requests FOR SELECT TO authenticated
 USING(customer_id=(SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM public.activities a WHERE a.id=activity_id AND a.provider_id=(SELECT auth.uid())
  ));
-- No direct INSERT/UPDATE/DELETE. Changes are authorized inside four RPC functions.
REVOKE ALL ON public.enrolment_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.enrolment_requests TO authenticated;

CREATE TABLE public.search_summary_cache (
 cache_key text PRIMARY KEY,
 summary text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL CHECK (expires_at > created_at)
);
CREATE INDEX search_summary_cache_expiry_idx ON public.search_summary_cache(expires_at);
ALTER TABLE public.search_summary_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.search_summary_cache FROM PUBLIC, anon, authenticated;
-- Only trusted backend/service role accesses this table.

CREATE TABLE public.search_summary_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
 requested_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX search_summary_requests_user_date_idx
 ON public.search_summary_requests(user_id,requested_at DESC);
ALTER TABLE public.search_summary_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.search_summary_requests FROM PUBLIC, anon, authenticated;
-- No search text or personal profile details are logged.
