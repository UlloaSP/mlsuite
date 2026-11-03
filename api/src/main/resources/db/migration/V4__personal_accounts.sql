-- A user owns things in a personal account: their own namespace row in organization, kept apart
-- from the organizations people share by its kind. The row is created with the user, and only
-- then, so nothing backfills it: this version starts from an empty database.
ALTER TABLE organization
    ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'TEAM'
        CONSTRAINT ck_organization_kind CHECK (kind IN ('PERSONAL', 'TEAM')),
    ADD COLUMN owner_user_id BIGINT CONSTRAINT fk_organization_owner_user REFERENCES app_user,
    ADD CONSTRAINT ck_organization_personal_owner CHECK ((kind = 'PERSONAL') = (owner_user_id IS NOT NULL));

CREATE UNIQUE INDEX uq_organization_personal_owner ON organization (owner_user_id) WHERE kind = 'PERSONAL';

-- Usernames and organization slugs share one handle namespace: a personal account's slug is its
-- owner's username, so uq_organization_slug guards both, and usernames are unique on their own.
ALTER TABLE app_user ADD CONSTRAINT uq_app_user_username UNIQUE (username);
