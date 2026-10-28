ALTER TABLE authors ADD COLUMN google_scholar_id text;
ALTER TABLE authors ALTER COLUMN openalex_author_id DROP NOT NULL;