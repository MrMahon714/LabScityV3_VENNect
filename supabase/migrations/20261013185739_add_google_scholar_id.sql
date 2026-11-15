ALTER TABLE authors ADD COLUMN IF NOT EXISTS google_scholar_id text;
ALTER TABLE authors ALTER COLUMN openalex_author_id DROP NOT NULL;
