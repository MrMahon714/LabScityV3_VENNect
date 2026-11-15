BEGIN;

CREATE OR REPLACE FUNCTION public.recompute_profile_tags_from_publications(p_user_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  DELETE FROM profile_tags WHERE profile_user_id = p_user_id;

  INSERT INTO profile_tags (profile_user_id, tag_id, raw_count, weight)
  SELECT
    p_user_id,
    tag_id,
    sum(cnt)::integer as raw_count,
    sum(cnt)::double precision / nullif(sum(sum(cnt)) over (), 0) as weight
  FROM (
    SELECT pt.tag_id, count(*) as cnt
    FROM publication_tags pt
    JOIN user_publications up ON up.publication_id = pt.publication_id
    WHERE up.user_id = p_user_id
      AND pt.tag_id IS NOT NULL
    GROUP BY pt.tag_id

    UNION ALL

    SELECT pdt.tag_id, count(*) as cnt
    FROM product_tags pdt
    JOIN user_products up2 ON up2.product_id = pdt.product_id
    WHERE up2.user_id = p_user_id
      AND pdt.tag_id IS NOT NULL
    GROUP BY pdt.tag_id
  ) combined
  GROUP BY tag_id;
$function$;

COMMIT;
