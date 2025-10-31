CREATE TABLE
    IF NOT EXISTS app_user (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL,
        oauth_provider SMALLINT NOT NULL,
        oauth_id VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        full_name VARCHAR(150),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_app_user_oauth UNIQUE (oauth_provider, oauth_id),
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
    IF NOT EXISTS model (
        id BIGINT GENERATED ALWAYS AS IDENTITY,
        user_id BIGINT NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(255) NOT NULL,
        specific_type VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        model_file BYTEA NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT pk_model PRIMARY KEY (id),
        CONSTRAINT fk_model_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE,
        CONSTRAINT uq_model_name_user UNIQUE (user_id, name)
    );

DROP TRIGGER IF EXISTS set_updated_at ON model;

CREATE TRIGGER set_updated_at BEFORE
UPDATE ON model FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at ();

CREATE TABLE
    IF NOT EXISTS signature (
        id BIGINT GENERATED ALWAYS AS IDENTITY,
        model_id BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL,
        input_signature JSONB NOT NULL,
        origin BIGINT,
        major INT NOT NULL,
        minor INT NOT NULL,
        patch INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT pk_signature PRIMARY KEY (id),
        CONSTRAINT fk_signature_model FOREIGN KEY (model_id) REFERENCES model (id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE,
        CONSTRAINT uq_signature_model UNIQUE (model_id, input_signature),
        CONSTRAINT uq_version_signature UNIQUE (model_id, major, minor, patch),
        CONSTRAINT ck_version_format CHECK (
            major >= 0
            AND minor >= 0
            AND patch >= 0
        ),
        CONSTRAINT fk_origin_signature FOREIGN KEY (origin) REFERENCES signature (id) ON DELETE SET NULL ON UPDATE CASCADE DEFERRABLE
    );

DROP TRIGGER IF EXISTS set_updated_at ON signature;

CREATE TRIGGER set_updated_at BEFORE
UPDATE ON signature FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at ();

CREATE TABLE
    IF NOT EXISTS prediction (
        id BIGINT GENERATED ALWAYS AS IDENTITY,
        signature_id BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        prediction JSONB NOT NULL,
        status SMALLINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT pk_prediction PRIMARY KEY (id),
        CONSTRAINT uq_prediction_signature_name UNIQUE (signature_id, name),
        CONSTRAINT fk_prediction_signature FOREIGN KEY (signature_id) REFERENCES signature (id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE
    );

DROP TRIGGER IF EXISTS set_updated_at ON prediction;

CREATE TRIGGER set_updated_at BEFORE
UPDATE ON prediction FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at ();

CREATE TABLE
    IF NOT EXISTS target (
        id BIGINT GENERATED ALWAYS AS IDENTITY,
        prediction_id BIGINT NOT NULL,
        orden INT NOT NULL,
        data_value JSONB NOT NULL,
        real_value JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT pk_target PRIMARY KEY (id),
        CONSTRAINT fk_target_prediction FOREIGN KEY (prediction_id) REFERENCES prediction (id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE
    );

DROP TRIGGER IF EXISTS set_updated_at ON target;

CREATE TRIGGER set_updated_at BEFORE
UPDATE ON target FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at ();