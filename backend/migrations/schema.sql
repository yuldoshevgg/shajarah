-- ============================================================
-- Shajarah – Full Database Schema
-- Architecture: User ≠ Person ≠ Family (strict separation)
-- Relationships are graph edges, never stored as columns.
-- ============================================================


-- ------------------------------------------------------------
-- users  (authentication only)
-- ------------------------------------------------------------
CREATE TABLE users (
    id            UUID PRIMARY KEY,
    email         TEXT      UNIQUE NOT NULL,
    password_hash TEXT      NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- families  (graph container)
-- ------------------------------------------------------------
CREATE TABLE families (
    id         UUID PRIMARY KEY,
    name       TEXT      NOT NULL,
    owner_id   UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_family_owner
        FOREIGN KEY (owner_id) REFERENCES users(id)
);


-- ------------------------------------------------------------
-- family_members  (user access to a family)
-- ------------------------------------------------------------
CREATE TABLE family_members (
    id        UUID PRIMARY KEY,
    family_id UUID      NOT NULL,
    user_id   UUID      NOT NULL,
    role      TEXT      NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_family_members_family
        FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    CONSTRAINT fk_family_members_user
        FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT uq_family_members
        UNIQUE (family_id, user_id)
);


-- ------------------------------------------------------------
-- persons  (nodes in the family graph — independent of users)
-- ------------------------------------------------------------
CREATE TABLE persons (
    id         UUID PRIMARY KEY,
    family_id  UUID,
    first_name TEXT      NOT NULL,
    last_name  TEXT,
    gender     TEXT,
    birth_date DATE,
    death_date DATE,
    biography  TEXT,
    email      TEXT,
    visibility TEXT      NOT NULL DEFAULT 'family_only',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_person_family
        FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- email unique only when provided
CREATE UNIQUE INDEX persons_email_unique ON persons (email) WHERE email IS NOT NULL;


-- ------------------------------------------------------------
-- user_person_links  (bridges a user account ↔ person node)
--
-- Rules:
--   • one user  → at most one person per family
--   • one person → at most one user
-- Created on invitation accept or claim approval.
-- ------------------------------------------------------------
CREATE TABLE user_person_links (
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

    -- one user per family
    CONSTRAINT uq_upl_user_family   UNIQUE (user_id,   family_id),
    -- one user per person
    CONSTRAINT uq_upl_person        UNIQUE (person_id)
);


-- ------------------------------------------------------------
-- relationships  (graph edges — the ONLY place relations live)
--
-- Allowed relation_type values: parent | child | spouse | sibling
--   • parent  – directional: person1_id IS THE PARENT of person2_id
--   • child   – directional: person1_id IS THE CHILD  of person2_id
--   • spouse  – bidirectional
--   • sibling – bidirectional (prefer deriving rather than duplicating)
--
-- Derived relations (grandparent, uncle, cousin, in-law, …) are
-- computed via graph traversal and MUST NOT be stored here.
-- ------------------------------------------------------------
CREATE TABLE relationships (
    id            UUID PRIMARY KEY,
    family_id     UUID NOT NULL,
    person1_id    UUID NOT NULL,
    person2_id    UUID NOT NULL,
    relation_type TEXT NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_relationship_family
        FOREIGN KEY (family_id)  REFERENCES families(id) ON DELETE CASCADE,
    CONSTRAINT fk_relationship_person1
        FOREIGN KEY (person1_id) REFERENCES persons(id)  ON DELETE CASCADE,
    CONSTRAINT fk_relationship_person2
        FOREIGN KEY (person2_id) REFERENCES persons(id)  ON DELETE CASCADE,
    CONSTRAINT chk_relation_type
        CHECK (relation_type IN ('parent', 'child', 'spouse', 'sibling'))
);


-- ------------------------------------------------------------
-- invitations  (preferred path for linking user ↔ person)
--
-- Flow:
--   1. existing user creates a person node (e.g. "sister")
--   2. invitation is created with person_id + token
--   3. token is sent to the invitee
--   4. invitee registers / logs in → accepts invitation
--   5. user_person_links row is created
-- ------------------------------------------------------------
CREATE TABLE invitations (
    id         UUID PRIMARY KEY,
    family_id  UUID NOT NULL,
    person_id  UUID NOT NULL,
    invited_by UUID,
    token      TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    role       TEXT,
    status     TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_invitation_family
        FOREIGN KEY (family_id)  REFERENCES families(id) ON DELETE CASCADE,
    CONSTRAINT fk_invitation_person
        FOREIGN KEY (person_id)  REFERENCES persons(id)  ON DELETE CASCADE,
    CONSTRAINT fk_invitation_invited_by
        FOREIGN KEY (invited_by) REFERENCES users(id)
);


-- ------------------------------------------------------------
-- claims  (fallback path when no invitation exists)
--
-- Flow:
--   1. user finds an unclaimed person and submits a claim
--   2. family admin approves
--   3. user_person_links row is created
-- ------------------------------------------------------------
CREATE TABLE claims (
    id         UUID PRIMARY KEY,
    person_id  UUID NOT NULL,
    user_id    UUID NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_claim_person
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
    CONSTRAINT fk_claim_user
        FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
    CONSTRAINT uq_claim
        UNIQUE (person_id, user_id)
);


-- ------------------------------------------------------------
-- photos
-- ------------------------------------------------------------
CREATE TABLE photos (
    id          UUID PRIMARY KEY,
    person_id   UUID NOT NULL,
    url         TEXT NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_photo_person
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
);


-- ------------------------------------------------------------
-- stories
-- ------------------------------------------------------------
CREATE TABLE stories (
    id         UUID PRIMARY KEY,
    person_id  UUID NOT NULL,
    title      TEXT NOT NULL,
    content    TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_story_person
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
);


-- ------------------------------------------------------------
-- events
-- ------------------------------------------------------------
CREATE TABLE events (
    id          UUID PRIMARY KEY,
    person_id   UUID NOT NULL,
    event_type  TEXT NOT NULL,
    event_date  DATE,
    description TEXT,

    CONSTRAINT fk_event_person
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
);


-- ------------------------------------------------------------
-- documents
-- ------------------------------------------------------------
CREATE TABLE documents (
    id          UUID PRIMARY KEY,
    person_id   UUID NOT NULL,
    file_url    TEXT NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_document_person
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
);


-- ------------------------------------------------------------
-- audit_logs
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL,
    family_id   UUID,
    action      TEXT NOT NULL,
    entity_type TEXT,
    entity_id   TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_audit_family
        FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);


-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
CREATE TABLE notifications (
    id         UUID PRIMARY KEY,
    user_id    UUID    NOT NULL,
    family_id  UUID,
    message    TEXT    NOT NULL,
    type       TEXT    NOT NULL DEFAULT 'general',
    ref        TEXT,
    read       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_notification_family
        FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);
