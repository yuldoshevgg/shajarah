ALTER TABLE users
    ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free'
        CHECK (plan IN ('free', 'premium'));
