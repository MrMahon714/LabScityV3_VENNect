-- Raises the cap on profile skills and research areas (declared tags) from 20 to 100.
-- Must match MAX_PROFILE_SKILLS / MAX_PROFILE_TAGS in src/lib/constants/profile.ts.

CREATE OR REPLACE FUNCTION public.update_declared_tags(p_tag_ids bigint[], p_custom_names text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(array_length(p_tag_ids, 1), 0)
   + coalesce(array_length(p_custom_names, 1), 0) > 100 then
    raise exception 'Must list at most 100 research areas';
  end if;

  delete from declared_profile_tags where user_id = uid;

  insert into declared_profile_tags (user_id, tag_id)
  select uid, unnest(p_tag_ids);

  insert into declared_profile_tags (user_id, name)
  select uid, unnest(p_custom_names);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_profile_skills(p_skill_ids bigint[], p_custom_names text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
 
  if coalesce(array_length(p_skill_ids, 1), 0)
   + coalesce(array_length(p_custom_names, 1), 0) > 100 then
    raise exception 'Too many skills';
  end if;

  delete from profile_skills where profile_user_id = uid;
  delete from custom_profile_skills where user_id = uid;

  insert into profile_skills (profile_user_id, skill_id)
  select uid, unnest(p_skill_ids);

  insert into custom_profile_skills (user_id, name)
  select uid, unnest(p_custom_names);
end;
$function$
;