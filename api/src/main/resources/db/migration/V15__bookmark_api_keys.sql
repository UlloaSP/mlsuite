-- A secret a member issues on a bookmark for one outside consumer, who runs the bookmark's model
-- with it from their own software. Only the secret's SHA-256 is kept, with its first characters
-- to tell keys apart. A key never expires: it is revoked by deleting it, and leaves with its
-- bookmark. A consumer's name is unique on a bookmark whatever its case.
CREATE TABLE bookmark_api_key (
    id BIGSERIAL PRIMARY KEY,
    schema_bookmark_id BIGINT NOT NULL,
    name VARCHAR(80) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    key_hash CHAR(64) NOT NULL,
    created_by_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,
    CONSTRAINT uq_bookmark_api_key_hash UNIQUE (key_hash),
    CONSTRAINT fk_bookmark_api_key_bookmark FOREIGN KEY (schema_bookmark_id)
        REFERENCES schema_bookmark (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_bookmark_api_key_bookmark_name ON bookmark_api_key (schema_bookmark_id, lower(name));

-- A run made with a key is kept as the organization's like any other and told apart as API.
ALTER TABLE prediction_run DROP CONSTRAINT ck_prediction_run_origin;
ALTER TABLE prediction_run ADD CONSTRAINT ck_prediction_run_origin
    CHECK (origin IN ('WORKSPACE', 'PUBLIC', 'API'));
