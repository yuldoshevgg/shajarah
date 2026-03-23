-- ============================================================
-- Migration 014 — Graph-only relationships
--
-- Primitives stored:  parent (directional)  +  spouse (bidirectional)
-- Everything else (child, sibling, uncle, cousin …) is DERIVED
-- at query time via graph traversal.
--
-- Also applies the DDL from 013 that was never executed
-- (only the TRUNCATE was run).
-- ============================================================


-- ------------------------------------------------------------
-- persons — drop denormalised relation columns (from 013 DDL)
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
-- users — drop person_id (from 013 DDL)
-- ------------------------------------------------------------
ALTER TABLE users
    DROP CONSTRAINT IF EXISTS fk_user_person,
    DROP COLUMN  IF EXISTS person_id;


-- ------------------------------------------------------------
-- relationships — add family_id + enforce primitive types only
-- ------------------------------------------------------------
ALTER TABLE relationships
    ADD COLUMN IF NOT EXISTS family_id UUID
        REFERENCES families(id) ON DELETE CASCADE;

ALTER TABLE relationships
    DROP CONSTRAINT IF EXISTS chk_relation_type;

-- Only primitives live in this table.
-- child / sibling / grandparent / uncle / cousin … are DERIVED.
ALTER TABLE relationships
    ADD CONSTRAINT chk_relation_type
        CHECK (relation_type IN ('parent', 'spouse'));


-- ------------------------------------------------------------
-- invitations — drop old columns, require person_id (from 013)
-- ------------------------------------------------------------
ALTER TABLE invitations DROP COLUMN IF EXISTS relation_type;
ALTER TABLE invitations DROP COLUMN IF EXISTS email;

ALTER TABLE invitations
    ADD COLUMN IF NOT EXISTS person_id UUID
        REFERENCES persons(id) ON DELETE CASCADE;


-- ------------------------------------------------------------
-- user_person_links — bridge user ↔ person node (from 013)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_person_links (
    id         UUID PRIMARY KEY,
    user_id    UUID      NOT NULL,
    person_id  UUID      NOT NULL,
    family_id  UUID      NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_upl_user   FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_upl_person FOREIGN KEY (person_id) REFERENCES persons(id)  ON DELETE CASCADE,
    CONSTRAINT fk_upl_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,

    CONSTRAINT uq_upl_user_family UNIQUE (user_id,  family_id),
    CONSTRAINT uq_upl_person      UNIQUE (person_id)
);
