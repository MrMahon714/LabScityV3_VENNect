-- RLS enablement from the linked-schema diff.
ALTER TABLE public.custom_profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.declared_profile_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs_applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- Remove anon table privileges on jobs; the new policies are for authenticated users.
REVOKE DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
ON TABLE public.jobs FROM anon;

-- These older product_tags policies are superseded by the more specific policies
-- already present in the current schema.
DROP POLICY IF EXISTS "Enable insert for authenticated users only"
ON public.product_tags;

DROP POLICY IF EXISTS "Enable read access for all users"
ON public.product_tags;

CREATE POLICY "Authenticated users can view jobs"
ON public.jobs
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create their own jobs"
ON public.jobs
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = poster_id);

CREATE POLICY "Users can delete their own jobs"
ON public.jobs
AS PERMISSIVE
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = poster_id);

CREATE POLICY "Users can update their own jobs"
ON public.jobs
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = poster_id)
WITH CHECK ((SELECT auth.uid()) = poster_id);

CREATE POLICY "Applicants can view their own applications"
ON public.jobs_applicants
AS PERMISSIVE
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Applicants can withdraw their own applications"
ON public.jobs_applicants
AS PERMISSIVE
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Job posters can view applications"
ON public.jobs_applicants
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs AS j
    WHERE j.id = jobs_applicants.job_id
      AND j.poster_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can submit their own applications"
ON public.jobs_applicants
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Anyone can view job skills"
ON public.jobs_skills
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Owners can add job skills"
ON public.jobs_skills
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.jobs AS j
    WHERE j.id = jobs_skills.job_id
      AND j.poster_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Owners can remove job skills"
ON public.jobs_skills
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs AS j
    WHERE j.id = jobs_skills.job_id
      AND j.poster_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Anyone can view public job tags"
ON public.jobs_tags
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users can add their own profile skills"
ON public.profile_skills
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = profile_user_id);

CREATE POLICY "Users can delete their own profile skills"
ON public.profile_skills
AS PERMISSIVE
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = profile_user_id);

CREATE POLICY "Users can update their own profile skills"
ON public.profile_skills
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = profile_user_id)
WITH CHECK ((SELECT auth.uid()) = profile_user_id);

CREATE POLICY "Users can view their own profile skills"
ON public.profile_skills
AS PERMISSIVE
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = profile_user_id);

CREATE POLICY "Anyone can read skills"
ON public.skills
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (true);
