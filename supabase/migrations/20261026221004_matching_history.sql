-- supabase/migrations/20261025234500_match_searches.sql
BEGIN;

CREATE TABLE public.match_searches (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profile(user_id) ON DELETE CASCADE,
  filters jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX match_searches_user_created_idx
ON public.match_searches (user_id, created_at DESC);

ALTER TABLE public.match_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own searches" ON public.match_searches
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own searches" ON public.match_searches
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own searches" ON public.match_searches
FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.match_searches TO authenticated;

COMMIT;
