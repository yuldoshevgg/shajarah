ALTER TABLE persons ADD COLUMN IF NOT EXISTS email TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS persons_email_unique ON persons (email) WHERE email IS NOT NULL;
