BEGIN;

ALTER TABLE public.profile
  ADD COLUMN IF NOT EXISTS offers_embedding extensions.vector(1024),
  ADD COLUMN IF NOT EXISTS seeks_embedding extensions.vector(1024),
  ADD COLUMN IF NOT EXISTS seeking_description text;

ALTER TABLE public.publications
  ADD COLUMN IF NOT EXISTS abstract text,
  ADD COLUMN IF NOT EXISTS ai_topics text[];

CREATE OR REPLACE FUNCTION public.bulk_import_user_publications(
  p_publications jsonb,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_total int;
  v_inserted int;
  v_topics_linked int;
BEGIN
  v_total := jsonb_array_length(p_publications);

  WITH parsed AS (
    SELECT *
    FROM jsonb_to_recordset(p_publications)
      AS p(
        title text,
        doi text,
        journal text,
        "publicationDate" date,
        authors text[],
        type openalex_work_type,
        "isOA" boolean,
        "pdfUrl" text,
        "openAlexTopicIds" text[],
        abstract text
      )
  ),
  ins_pubs AS (
    INSERT INTO public.publications (
      title,
      doi,
      journal,
      date_published,
      authors,
      type,
      is_oa,
      pdf_url,
      abstract
    )
    SELECT
      title,
      doi,
      journal,
      "publicationDate",
      authors,
      type,
      "isOA",
      "pdfUrl",
      abstract
    FROM parsed
    ON CONFLICT (doi) DO NOTHING
    RETURNING publication_id, doi
  ),
  all_pub_ids AS (
    SELECT publication_id, doi
    FROM ins_pubs

    UNION

    SELECT
      p.publication_id,
      p.doi
    FROM public.publications AS p
    JOIN parsed
      ON p.doi = parsed.doi
  ),
  ins_links AS (
    INSERT INTO public.user_publications (
      user_id,
      publication_id
    )
    SELECT
      p_user_id,
      all_pub_ids.publication_id
    FROM all_pub_ids
    ON CONFLICT (user_id, publication_id) DO NOTHING
    RETURNING publication_id
  ),
  pub_topics AS (
    SELECT
      all_pub_ids.publication_id,
      topic_id
    FROM all_pub_ids
    JOIN parsed
      ON all_pub_ids.doi = parsed.doi
    CROSS JOIN LATERAL unnest(parsed."openAlexTopicIds") AS topic_id
  ),
  pub_tags AS (
    SELECT
      pub_topics.publication_id,
      tags.id AS tag_id
    FROM pub_topics
    JOIN public.tags
      ON tags.openalex_id = topic_id
  ),
  ins_pub_tags AS (
    INSERT INTO public.publication_tags (
      publication_id,
      tag_id
    )
    SELECT
      publication_id,
      tag_id
    FROM pub_tags
    ON CONFLICT (publication_id, tag_id) DO NOTHING
    RETURNING 1
  )
  SELECT
    count(*),
    (SELECT count(*) FROM ins_pub_tags)
  INTO
    v_inserted,
    v_topics_linked
  FROM ins_links;

  RETURN json_build_object(
    'inserted', v_inserted,
    'skipped', v_total - v_inserted
  );
END;
$function$;

COMMIT;
