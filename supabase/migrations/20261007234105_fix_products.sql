DROP POLICY IF EXISTS "Users can add OpenAlex tags to their products"
ON public.product_tags;

CREATE POLICY "Users can add product topics to their products"
ON public.product_tags
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_products AS up
    WHERE up.product_id = product_tags.product_id
      AND up.user_id = (SELECT auth.uid())
  )
  AND (
    (
      product_tags.tag_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.tags AS t
        WHERE t.id = product_tags.tag_id
          AND t.openalex_id IS NOT NULL
          AND (product_tags.name IS NULL OR product_tags.name = t.name)
      )
    )
    OR
    (
      product_tags.tag_id IS NULL
      AND product_tags.name IS NOT NULL
    )
  )
);

DROP POLICY IF EXISTS "Users can remove tags from their products"
ON public.product_tags;

CREATE POLICY "Users can remove tags from their products"
ON public.product_tags
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_products AS up
    WHERE up.product_id = product_tags.product_id
      AND up.user_id = (SELECT auth.uid())
  )
);
