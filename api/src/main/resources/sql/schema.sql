CREATE TABLE
    IF NOT EXISTS app_user (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        full_name VARCHAR(150) NOT NULL,
        system_role VARCHAR(32) NOT NULL DEFAULT 'USER',
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_app_user_email UNIQUE (email)
    );

-- ============================================
--  4. Trigger para mantener updated_at
--    (el estándar SQL no contempla ON UPDATE
--     como MySQL; aplicamos old-school trigger)
-- ============================================
CREATE
OR REPLACE FUNCTION trg_set_updated_at () RETURNS TRIGGER LANGUAGE plpgsql AS '
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
';

DROP TRIGGER IF EXISTS set_updated_at ON app_user;

CREATE TRIGGER set_updated_at BEFORE
UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at ();

CREATE TABLE
    IF NOT EXISTS organization (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        slug VARCHAR(120) NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        logo_url TEXT,
        created_by BIGINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_organization_slug UNIQUE (slug),
        CONSTRAINT fk_organization_creator FOREIGN KEY (created_by) REFERENCES app_user (id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE
    );

DROP TRIGGER IF EXISTS set_updated_at ON organization;

CREATE TRIGGER set_updated_at BEFORE
UPDATE ON organization FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at ();

CREATE TABLE
    IF NOT EXISTS organization_membership (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        role SMALLINT NOT NULL,
        status SMALLINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_org_membership_org_user UNIQUE (organization_id, user_id),
        CONSTRAINT fk_org_membership_org FOREIGN KEY (organization_id) REFERENCES organization (id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE,
        CONSTRAINT fk_org_membership_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE
    );

DROP TRIGGER IF EXISTS set_updated_at ON organization_membership;

CREATE TRIGGER set_updated_at BEFORE
UPDATE ON organization_membership FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at ();

CREATE TABLE
    IF NOT EXISTS model (
        id BIGINT GENERATED ALWAYS AS IDENTITY,
        user_id BIGINT NOT NULL,
        organization_id BIGINT,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(255) NOT NULL,
        specific_type VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        model_file BYTEA NOT NULL DEFAULT '\x',
        storage_bucket VARCHAR(100),
        storage_object_key VARCHAR(512),
        storage_etag VARCHAR(128),
        model_size_bytes BIGINT,
        input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT pk_model PRIMARY KEY (id),
        CONSTRAINT fk_model_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE,
        CONSTRAINT fk_model_organization FOREIGN KEY (organization_id) REFERENCES organization (id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE,
        CONSTRAINT uq_model_name_org UNIQUE (organization_id, name)
    );

DROP TRIGGER IF EXISTS set_updated_at ON model;

CREATE TRIGGER set_updated_at BEFORE
UPDATE ON model FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at ();

