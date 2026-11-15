BEGIN;

ALTER TABLE public.profile
ADD COLUMN IF NOT EXISTS seeking_visible boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profile.seeking_visible IS 'Controls whether collaboration-seeking intent is visible to other users viewing this profile. Matching logic ignores this flag and always uses the underlying intent.';

COMMIT;
