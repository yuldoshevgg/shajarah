CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);



CREATE TABLE families (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_family_owner
        FOREIGN KEY (owner_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);



CREATE TABLE family_members (
    id UUID PRIMARY KEY,
    family_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role TEXT NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_family_members_family
        FOREIGN KEY (family_id)
        REFERENCES families(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_family_members_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);



CREATE TABLE persons (
    id UUID PRIMARY KEY,
    family_id UUID NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    gender TEXT,
    birth_date DATE,
    death_date DATE,
    biography TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_person_family
        FOREIGN KEY (family_id)
        REFERENCES families(id)
        ON DELETE CASCADE
);



CREATE TABLE relationships (
    id UUID PRIMARY KEY,
    person1_id UUID NOT NULL,
    person2_id UUID NOT NULL,
    relation_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_relationship_person1
        FOREIGN KEY (person1_id)
        REFERENCES persons(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_relationship_person2
        FOREIGN KEY (person2_id)
        REFERENCES persons(id)
        ON DELETE CASCADE
);




CREATE TABLE photos (
    id UUID PRIMARY KEY,
    person_id UUID NOT NULL,
    url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_photo_person
        FOREIGN KEY (person_id)
        REFERENCES persons(id)
        ON DELETE CASCADE
);




CREATE TABLE stories (
    id UUID PRIMARY KEY,
    person_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_story_person
        FOREIGN KEY (person_id)
        REFERENCES persons(id)
        ON DELETE CASCADE
);



CREATE TABLE events (
    id UUID PRIMARY KEY,
    person_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    event_date DATE,
    description TEXT,

    CONSTRAINT fk_event_person
        FOREIGN KEY (person_id)
        REFERENCES persons(id)
        ON DELETE CASCADE
);




CREATE TABLE documents (
    id UUID PRIMARY KEY,
    person_id UUID NOT NULL,
    file_url TEXT NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_document_person
        FOREIGN KEY (person_id)
        REFERENCES persons(id)
        ON DELETE CASCADE
);




CREATE TABLE invitations (
    id UUID PRIMARY KEY,
    family_id UUID NOT NULL,
    email TEXT NOT NULL,
    role TEXT,
    status TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_invitation_family
        FOREIGN KEY (family_id)
        REFERENCES families(id)
        ON DELETE CASCADE
);



CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
