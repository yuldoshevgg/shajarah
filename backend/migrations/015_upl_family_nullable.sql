-- Allow user_person_links.family_id to be NULL at registration time
-- (the family is assigned later when the user accepts an invitation)
ALTER TABLE user_person_links
    ALTER COLUMN family_id DROP NOT NULL;
