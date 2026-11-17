-- supabase/migrations/<new_timestamp>_raise_unknown_penalty.sql
BEGIN;

CREATE OR REPLACE FUNCTION public.get_collaborators_filtered(current_user_id uuid, filter_embedding extensions.vector DEFAULT NULL::extensions.vector, product_types text[] DEFAULT NULL::text[], recent_years integer DEFAULT NULL::integer, location_query text DEFAULT NULL::text, career_stages text[] DEFAULT NULL::text[])
 RETURNS TABLE(profile_user_id uuid, cosine_similarity double precision, first_name text, last_name text, profile_pic_path text, occupation text, workplace text, match_tier text, profile_score double precision, search_score double precision, they_offer_you_seek double precision, you_offer_they_seek double precision)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  cur_offers extensions.vector;
  cur_seeks extensions.vector;
  cur_tag_vec extensions.vector;
  cur_decl_vec extensions.vector;
  cur_skill_vec extensions.vector;
  filter_weight CONSTANT double precision := 0.7;
  unknown_penalty CONSTANT double precision := 0.98;
BEGIN
  -- Require an authenticated caller, and allow them to request only their own matches.
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM current_user_id THEN
    RAISE EXCEPTION 'Not allowed to view matches for another user'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.offers_embedding, p.seeks_embedding,
         p.tag_embedding, p.declared_tag_embedding, p.skill_embedding
  INTO cur_offers, cur_seeks, cur_tag_vec, cur_decl_vec, cur_skill_vec
  FROM public.profile p
  WHERE p.user_id = current_user_id;

  RETURN QUERY
  WITH candidates AS (
    SELECT p.user_id, p.first_name, p.last_name, p.occupation, p.workplace,
           p.location, p.career_stage,
           p.offers_embedding, p.seeks_embedding,
           p.tag_embedding, p.declared_tag_embedding, p.skill_embedding,
           u.profile_pic_path
    FROM public.profile p
    JOIN public.users u ON u.user_id = p.user_id
    WHERE p.user_id <> current_user_id
      AND p.open_to_collaboration
      AND (p.offers_embedding IS NOT NULL
        OR p.tag_embedding IS NOT NULL
        OR p.declared_tag_embedding IS NOT NULL
        OR p.skill_embedding IS NOT NULL)
      AND (COALESCE(cardinality(product_types), 0) = 0
        OR EXISTS (
          SELECT 1
          FROM public.user_products_full upr
          WHERE upr.user_id = p.user_id
            AND upr.product_type::text = ANY (product_types)
        ))
      AND (recent_years IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.user_publications_full upb
          WHERE upb.user_id = p.user_id
            AND upb.date_published >= current_date
              - make_interval(years => recent_years)
        ))
      AND (location_query IS NULL
        OR NULLIF(btrim(p.location), '') IS NULL
        OR position(lower(location_query) IN lower(p.location)) > 0)
      AND (COALESCE(cardinality(career_stages), 0) = 0
        OR p.career_stage IS NULL
        OR p.career_stage = ANY (career_stages))
  ),
  scored AS (
    SELECT c.*,
      CASE
        WHEN cur_offers IS NOT NULL AND cur_seeks IS NOT NULL
         AND c.offers_embedding IS NOT NULL AND c.seeks_embedding IS NOT NULL
          THEN 'bidirectional'
        WHEN cur_offers IS NOT NULL AND c.offers_embedding IS NOT NULL
          THEN 'offers_only'
        ELSE 'legacy'
      END AS tier,
      CASE
        WHEN cur_seeks IS NOT NULL AND c.offers_embedding IS NOT NULL
          THEN 1 - (cur_seeks <=> c.offers_embedding)
      END AS seek_to_offer,
      CASE
        WHEN c.seeks_embedding IS NOT NULL AND cur_offers IS NOT NULL
          THEN 1 - (c.seeks_embedding <=> cur_offers)
      END AS offer_to_seek,
      COALESCE(CASE
        WHEN cur_offers IS NOT NULL AND cur_seeks IS NOT NULL
         AND c.offers_embedding IS NOT NULL AND c.seeks_embedding IS NOT NULL THEN
          ((1 - (cur_seeks <=> c.offers_embedding))
           + (1 - (c.seeks_embedding <=> cur_offers))) / 2
        WHEN cur_offers IS NOT NULL AND c.offers_embedding IS NOT NULL THEN
          1 - (cur_offers <=> c.offers_embedding)
        ELSE
          ( COALESCE(1 - (c.tag_embedding <=> cur_tag_vec), 0) * 0.4
          + COALESCE(1 - (c.declared_tag_embedding <=> cur_decl_vec), 0) * 0.3
          + COALESCE(1 - (c.skill_embedding <=> cur_skill_vec), 0) * 0.3 )
          / NULLIF(
              CASE
                WHEN c.tag_embedding IS NOT NULL AND cur_tag_vec IS NOT NULL
                  THEN 0.4 ELSE 0
              END
            + CASE
                WHEN c.declared_tag_embedding IS NOT NULL AND cur_decl_vec IS NOT NULL
                  THEN 0.3 ELSE 0
              END
            + CASE
                WHEN c.skill_embedding IS NOT NULL AND cur_skill_vec IS NOT NULL
                  THEN 0.3 ELSE 0
              END,
            0
          )
      END, 0) AS base_score,
      CASE
        WHEN filter_embedding IS NOT NULL AND c.offers_embedding IS NOT NULL
          THEN 1 - (filter_embedding <=> c.offers_embedding)
      END AS filter_score
    FROM candidates c
  )
  SELECT
    s.user_id,
    (
      CASE
        WHEN filter_embedding IS NULL THEN s.base_score
        ELSE (1 - filter_weight) * s.base_score
           + filter_weight * COALESCE(s.filter_score, 0)
      END
      * CASE
          WHEN location_query IS NOT NULL
           AND NULLIF(btrim(s.location), '') IS NULL
            THEN unknown_penalty
          ELSE 1
        END
      * CASE
          WHEN COALESCE(cardinality(career_stages), 0) > 0
           AND s.career_stage IS NULL
            THEN unknown_penalty
          ELSE 1
        END
    )::double precision,
    s.first_name,
    s.last_name,
    s.profile_pic_path,
    s.occupation,
    s.workplace,
    s.tier,
    s.base_score::double precision,
    s.filter_score::double precision,
    s.seek_to_offer::double precision,
    s.offer_to_seek::double precision
  FROM scored s
  ORDER BY 2 DESC NULLS LAST;
END;
$function$;

COMMIT;
