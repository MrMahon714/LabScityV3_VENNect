BEGIN;

CREATE OR REPLACE FUNCTION public.get_collaborators_final(
  current_user_id uuid
)
RETURNS TABLE(
  profile_user_id uuid,
  cosine_similarity double precision,
  first_name text,
  last_name text,
  profile_pic_path text,
  occupation text,
  workplace text
)
LANGUAGE plpgsql
AS $function$
DECLARE
  cur_offers extensions.vector;
  cur_seeks extensions.vector;
  cur_tag_vec extensions.vector;
  cur_decl_vec extensions.vector;
  cur_skill_vec extensions.vector;
BEGIN
  SELECT
    p.offers_embedding,
    p.seeks_embedding,
    p.tag_embedding,
    p.declared_tag_embedding,
    p.skill_embedding
  INTO
    cur_offers,
    cur_seeks,
    cur_tag_vec,
    cur_decl_vec,
    cur_skill_vec
  FROM public.profile AS p
  WHERE p.user_id = current_user_id;

  RETURN QUERY
  SELECT
    p.user_id AS profile_user_id,
    CASE
      WHEN cur_offers IS NOT NULL
       AND cur_seeks IS NOT NULL
       AND p.offers_embedding IS NOT NULL
       AND p.seeks_embedding IS NOT NULL
      THEN
        (
          (1 - (cur_seeks <=> p.offers_embedding))
          + (1 - (p.seeks_embedding <=> cur_offers))
        ) / 2

      WHEN cur_offers IS NOT NULL
       AND p.offers_embedding IS NOT NULL
      THEN
        1 - (cur_offers <=> p.offers_embedding)

      WHEN cur_seeks IS NOT NULL
       AND p.seeks_embedding IS NOT NULL
      THEN
        1 - (cur_seeks <=> p.seeks_embedding)

      ELSE
        (
          COALESCE(1 - (p.tag_embedding <=> cur_tag_vec), 0) * 0.4
          + COALESCE(
              1 - (p.declared_tag_embedding <=> cur_decl_vec),
              0
            ) * 0.3
          + COALESCE(1 - (p.skill_embedding <=> cur_skill_vec), 0) * 0.3
        )
        / NULLIF(
            CASE
              WHEN p.tag_embedding IS NOT NULL
               AND cur_tag_vec IS NOT NULL
              THEN 0.4
              ELSE 0
            END
            + CASE
                WHEN p.declared_tag_embedding IS NOT NULL
                 AND cur_decl_vec IS NOT NULL
                THEN 0.3
                ELSE 0
              END
            + CASE
                WHEN p.skill_embedding IS NOT NULL
                 AND cur_skill_vec IS NOT NULL
                THEN 0.3
                ELSE 0
              END,
            0
          )
    END AS cosine_similarity,
    p.first_name,
    p.last_name,
    u.profile_pic_path,
    p.occupation,
    p.workplace
  FROM public.profile AS p
  JOIN public.users AS u
    ON u.user_id = p.user_id
  WHERE p.user_id <> current_user_id
    AND (
      p.offers_embedding IS NOT NULL
      OR p.seeks_embedding IS NOT NULL
      OR p.tag_embedding IS NOT NULL
      OR p.declared_tag_embedding IS NOT NULL
      OR p.skill_embedding IS NOT NULL
    )
  ORDER BY cosine_similarity DESC NULLS LAST;
END;
$function$;

COMMIT;
