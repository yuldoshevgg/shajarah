-- ============================================================
-- Migration 013 — Architecture Refactor
--
-- 1. Wipe all data (clean slate)
-- 2. Remove person_id from users
-- 3. Remove father_id / mother_id / spouse_id from persons
-- 4. Add family_id + CHECK to relationships
-- 5. Rebuild invitations (drop email/relation_type, add person_id)
-- 6. Create user_person_links
-- ============================================================


-- ------------------------------------------------------------
-- 1. Wipe all data
-- ------------------------------------------------------------
TRUNCATE TABLE
    notifications,
    audit_logs,
    claims,
    invitations,
    documents,
    events,
    stories,
    photos,
    relationships,
    user_person_links,
    persons,
    family_members,
    families,
    users
RESTART IDENTITY CASCADE;


-- ------------------------------------------------------------
-- 2. users — drop person_id
-- ------------------------------------------------------------
ALTER TABLE users
    DROP CONSTRAINT IF EXISTS fk_user_person,
    DROP COLUMN  IF EXISTS person_id;


-- ------------------------------------------------------------
-- 3. persons — drop denormalized relation columns
-- ------------------------------------------------------------
ALTER TABLE persons
    DROP CONSTRAINT IF EXISTS fk_person_father,
    DROP CONSTRAINT IF EXISTS fk_person_mother,
    DROP CONSTRAINT IF EXISTS fk_person_spouse,
    DROP CONSTRAINT IF EXISTS persons_father_id_fkey,
    DROP CONSTRAINT IF EXISTS persons_mother_id_fkey,
    DROP CONSTRAINT IF EXISTS persons_spouse_id_fkey,
    DROP COLUMN  IF EXISTS father_id,
    DROP COLUMN  IF EXISTS mother_id,
    DROP COLUMN  IF EXISTS spouse_id;


-- ------------------------------------------------------------
-- 4. relationships — add family_id + enforce allowed types
-- ------------------------------------------------------------
ALTER TABLE relationships
    ADD COLUMN IF NOT EXISTS family_id UUID
        REFERENCES families(id) ON DELETE CASCADE;

ALTER TABLE relationships
    DROP CONSTRAINT IF EXISTS chk_relation_type;

ALTER TABLE relationships
    ADD CONSTRAINT chk_relation_type
        CHECK (relation_type IN ('parent', 'child', 'spouse', 'sibling'));


-- ------------------------------------------------------------
-- 5. invitations — drop old columns, add person_id
-- ------------------------------------------------------------
ALTER TABLE invitations
    DROP COLUMN IF EXISTS relation_type,
    DROP COLUMN IF EXISTS email;

ALTER TABLE invitations
    ADD COLUMN IF NOT EXISTS person_id UUID
        REFERENCES persons(id) ON DELETE CASCADE;


-- ------------------------------------------------------------
-- 6. user_person_links — bridge user ↔ person, scoped by family
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_person_links (
    id         UUID PRIMARY KEY,
    user_id    UUID      NOT NULL,
    person_id  UUID      NOT NULL,
    family_id  UUID      NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_upl_user
        FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_upl_person
        FOREIGN KEY (person_id) REFERENCES persons(id)  ON DELETE CASCADE,
    CONSTRAINT fk_upl_family
        FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,

    CONSTRAINT uq_upl_user_family UNIQUE (user_id,  family_id),
    CONSTRAINT uq_upl_person      UNIQUE (person_id)
);
