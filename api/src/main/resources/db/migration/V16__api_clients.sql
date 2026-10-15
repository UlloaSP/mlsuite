-- Outside software runs an organization's models as one of its API clients. A client holds any
-- number of keys, so a key can be replaced without stopping its software, and may run the
-- bookmarks it was given access to, public or not. Every call a key makes is kept in
-- api_request: it meters the client, feeds the organization's and the platform's views, and
-- ties a call to the run it made.

-- VIEW_API_ACCESS and MANAGE_API_ACCESS join the permission catalog. RoleSeedService grants them
-- to each organization's OWNER and ADMIN system roles at startup.
ALTER TABLE role_permission DROP CONSTRAINT role_permission_permission_key_check;
ALTER TABLE role_permission ADD CONSTRAINT role_permission_permission_key_check CHECK (permission_key IN (
    'VIEW_WORKSPACE','VIEW_ORGANIZATION','EDIT_ORGANIZATION','DELETE_ORGANIZATION','TRANSFER_OWNERSHIP',
    'VIEW_MEMBERS','INVITE_MEMBERS','MANAGE_MEMBER_ROLES','REMOVE_MEMBERS','VIEW_INVITATIONS',
    'MANAGE_INVITATIONS','VIEW_MODELS','CREATE_MODELS','EDIT_MODELS','DELETE_MODELS','RUN_PREDICTIONS',
    'EXPORT_PREDICTIONS','PUBLISH_BOOKMARKS','REVIEW','MANAGE_REVIEWS','VIEW_PLUGINS','MANAGE_PLUGINS',
    'VIEW_AUDIT_LOG','VIEW_API_ACCESS','MANAGE_API_ACCESS'));

ALTER TABLE role_template_permission DROP CONSTRAINT role_template_permission_permission_key_check;
ALTER TABLE role_template_permission ADD CONSTRAINT role_template_permission_permission_key_check CHECK (permission_key IN (
    'VIEW_WORKSPACE','VIEW_ORGANIZATION','EDIT_ORGANIZATION','DELETE_ORGANIZATION','TRANSFER_OWNERSHIP',
    'VIEW_MEMBERS','INVITE_MEMBERS','MANAGE_MEMBER_ROLES','REMOVE_MEMBERS','VIEW_INVITATIONS',
    'MANAGE_INVITATIONS','VIEW_MODELS','CREATE_MODELS','EDIT_MODELS','DELETE_MODELS','RUN_PREDICTIONS',
    'EXPORT_PREDICTIONS','PUBLISH_BOOKMARKS','REVIEW','MANAGE_REVIEWS','VIEW_PLUGINS','MANAGE_PLUGINS',
    'VIEW_AUDIT_LOG','VIEW_API_ACCESS','MANAGE_API_ACCESS'));

-- The calls an organization's clients may make in a calendar month (UTC), set by a superadmin;
-- null follows the instance default.
ALTER TABLE organization
    ADD COLUMN api_monthly_call_limit INTEGER,
    ADD CONSTRAINT ck_organization_api_monthly_call_limit
        CHECK (api_monthly_call_limit IS NULL OR api_monthly_call_limit >= 0);

-- A client is suspended only by the platform, with the reason its organization is shown.
CREATE TABLE api_client (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    name VARCHAR(80) NOT NULL,
    description VARCHAR(400),
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    suspension_reason VARCHAR(400),
    suspended_at TIMESTAMPTZ,
    created_by_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_api_client_status CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    CONSTRAINT ck_api_client_suspension CHECK ((status = 'SUSPENDED') = (suspended_at IS NOT NULL)),
    CONSTRAINT fk_api_client_organization FOREIGN KEY (organization_id)
        REFERENCES organization (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_api_client_organization_name ON api_client (organization_id, lower(name));

-- Only the secret's SHA-256 is kept, with its first characters to tell keys apart.
CREATE TABLE api_client_key (
    id BIGSERIAL PRIMARY KEY,
    api_client_id BIGINT NOT NULL,
    name VARCHAR(80) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    key_hash CHAR(64) NOT NULL,
    created_by_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,
    CONSTRAINT uq_api_client_key_hash UNIQUE (key_hash),
    CONSTRAINT fk_api_client_key_client FOREIGN KEY (api_client_id)
        REFERENCES api_client (id) ON DELETE CASCADE
);

CREATE INDEX ix_api_client_key_client ON api_client_key (api_client_id);

CREATE TABLE api_client_bookmark (
    api_client_id BIGINT NOT NULL,
    schema_bookmark_id BIGINT NOT NULL,
    PRIMARY KEY (api_client_id, schema_bookmark_id),
    CONSTRAINT fk_api_client_bookmark_client FOREIGN KEY (api_client_id)
        REFERENCES api_client (id) ON DELETE CASCADE,
    CONSTRAINT fk_api_client_bookmark_bookmark FOREIGN KEY (schema_bookmark_id)
        REFERENCES schema_bookmark (id) ON DELETE CASCADE
);

CREATE INDEX ix_api_client_bookmark_bookmark ON api_client_bookmark (schema_bookmark_id);

-- One call made with a valid key, whatever its outcome. The names are snapshots, so a call
-- still reads after its client, key or bookmark is gone; the organization's month is counted
-- here, so deleting a client does not give its calls back.
CREATE TABLE api_request (
    id BIGSERIAL PRIMARY KEY,
    request_id UUID NOT NULL,
    organization_id BIGINT NOT NULL,
    api_client_id BIGINT,
    client_name VARCHAR(80) NOT NULL,
    api_client_key_id BIGINT,
    key_prefix VARCHAR(16) NOT NULL,
    schema_bookmark_id BIGINT,
    bookmark_name VARCHAR(180),
    prediction_run_id BIGINT,
    status INTEGER NOT NULL,
    error_code VARCHAR(40),
    duration_ms INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_api_request_request_id UNIQUE (request_id),
    CONSTRAINT fk_api_request_organization FOREIGN KEY (organization_id)
        REFERENCES organization (id) ON DELETE CASCADE,
    CONSTRAINT fk_api_request_client FOREIGN KEY (api_client_id)
        REFERENCES api_client (id) ON DELETE SET NULL,
    CONSTRAINT fk_api_request_key FOREIGN KEY (api_client_key_id)
        REFERENCES api_client_key (id) ON DELETE SET NULL,
    CONSTRAINT fk_api_request_bookmark FOREIGN KEY (schema_bookmark_id)
        REFERENCES schema_bookmark (id) ON DELETE SET NULL,
    CONSTRAINT fk_api_request_run FOREIGN KEY (prediction_run_id)
        REFERENCES prediction_run (id) ON DELETE SET NULL
);

CREATE INDEX ix_api_request_organization_created ON api_request (organization_id, created_at DESC);
CREATE INDEX ix_api_request_client_created ON api_request (api_client_id, created_at DESC);
CREATE INDEX ix_api_request_created ON api_request (created_at);

-- Bookmark keys become clients. The keys an organization issued under one consumer name, on
-- any of its bookmarks, become one client named as its first key was, that may run each of
-- those bookmarks; every key keeps its secret, named after the bookmark it was issued on.
INSERT INTO api_client (organization_id, name, created_by_name, created_at, updated_at)
SELECT s.organization_id,
       (array_agg(k.name ORDER BY k.created_at, k.id))[1],
       (array_agg(k.created_by_name ORDER BY k.created_at, k.id))[1],
       min(k.created_at),
       min(k.created_at)
FROM bookmark_api_key k
JOIN schema_bookmark b ON b.id = k.schema_bookmark_id
JOIN schema_artifact s ON s.id = b.schema_id
GROUP BY s.organization_id, lower(k.name);

INSERT INTO api_client_key (api_client_id, name, key_prefix, key_hash, created_by_name, created_at, last_used_at)
SELECT c.id, left(b.name, 80), k.key_prefix, k.key_hash, k.created_by_name, k.created_at, k.last_used_at
FROM bookmark_api_key k
JOIN schema_bookmark b ON b.id = k.schema_bookmark_id
JOIN schema_artifact s ON s.id = b.schema_id
JOIN api_client c ON c.organization_id = s.organization_id AND lower(c.name) = lower(k.name);

INSERT INTO api_client_bookmark (api_client_id, schema_bookmark_id)
SELECT DISTINCT c.id, k.schema_bookmark_id
FROM bookmark_api_key k
JOIN schema_bookmark b ON b.id = k.schema_bookmark_id
JOIN schema_artifact s ON s.id = b.schema_id
JOIN api_client c ON c.organization_id = s.organization_id AND lower(c.name) = lower(k.name);

-- A client names a bookmark by its opaque id, which a bookmark that was never published lacks.
UPDATE schema_bookmark SET public_id = gen_random_uuid()::text
WHERE public_id IS NULL AND id IN (SELECT schema_bookmark_id FROM api_client_bookmark);

DROP TABLE bookmark_api_key;
