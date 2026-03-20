ALTER TABLE family_members ADD CONSTRAINT uq_family_members UNIQUE (family_id, user_id);
