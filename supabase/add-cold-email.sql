-- Add cold email columns to previews table
ALTER TABLE previews ADD COLUMN IF NOT EXISTS cold_email_subject TEXT;
ALTER TABLE previews ADD COLUMN IF NOT EXISTS cold_email_body TEXT;
