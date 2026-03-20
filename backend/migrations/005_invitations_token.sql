ALTER TABLE invitations ADD COLUMN token TEXT UNIQUE DEFAULT gen_random_uuid()::text NOT NULL;
ALTER TABLE invitations ADD COLUMN invited_by UUID REFERENCES users(id);
