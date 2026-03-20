ALTER TABLE families DROP CONSTRAINT fk_family_owner;
ALTER TABLE families ALTER COLUMN owner_id DROP NOT NULL;
