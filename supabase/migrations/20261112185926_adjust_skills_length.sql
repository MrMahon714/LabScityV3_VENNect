ALTER TABLE public.custom_profile_skills
DROP CONSTRAINT custom_skills_name_len;

ALTER TABLE public.custom_profile_skills
ADD CONSTRAINT custom_skills_name_len
CHECK (char_length(trim(name)) >= 1 AND char_length(trim(name)) <= 60);