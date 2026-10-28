BEGIN;

DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.posts;

CREATE POLICY "Users can post as themselves, group posts require membership"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND (
    group_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = posts.group_id AND gm.user_id = (SELECT auth.uid())
    )
  )
);

COMMIT;
