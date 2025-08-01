-- ============================================
--  1. Catálogo de tipos auxiliares
-- ============================================
/*
CREATE EXTENSION IF NOT EXISTS citext;       -- e-mail *case-insensitive*
*/

-- ============================================
--  2. Tabla maestra: app_user
-- ============================================
CREATE TABLE IF NOT EXISTS app_user (
    id              BIGINT GENERATED ALWAYS AS IDENTITY
                    PRIMARY KEY,

    username        VARCHAR(50)      NOT NULL,
    email           CITEXT           NOT NULL,
    oauth_provider  SMALLINT         NOT NULL,
    oauth_id        VARCHAR(255)     NOT NULL,

    display_name    VARCHAR(50),
    avatar_url      TEXT,
    full_name       VARCHAR(150),
    is_active       BOOLEAN          NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_by      BIGINT,
    updated_by      BIGINT,

    -- ===== Integridad de negocio =====
    CONSTRAINT uq_app_user_oauth      UNIQUE (oauth_provider, oauth_id),

    CONSTRAINT ck_avatar_url_scheme   CHECK (
        avatar_url IS NULL
        OR avatar_url ~ '^https?://'
    ),

    -- ===== Auditoría autocontenida =====
    CONSTRAINT fk_created_by
        FOREIGN KEY (created_by) REFERENCES app_user(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE DEFERRABLE,

    CONSTRAINT fk_updated_by
        FOREIGN KEY (updated_by) REFERENCES app_user(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE DEFERRABLE
);

-- ============================================
--  3. Índices de alto valor
-- ============================================
-- 3.1 Consultas cronológicas (scroll infinito, reporting)
CREATE INDEX IF NOT EXISTS idx_app_user_created_at
    ON app_user (created_at DESC);

-- 3.2 Accesos dominantes a “usuarios activos”
CREATE INDEX IF NOT EXISTS idx_app_user_active_true
    ON app_user (id)
    WHERE is_active;

-- ============================================
--  4. Trigger para mantener updated_at
--    (el estándar SQL no contempla ON UPDATE
--     como MySQL; aplicamos old-school trigger)
-- ============================================
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS '
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
';


DROP TRIGGER IF EXISTS set_updated_at ON app_user;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON app_user
FOR EACH ROW
EXECUTE FUNCTION trg_set_updated_at();


CREATE TABLE IF NOT EXISTS model (
    id            BIGINT GENERATED ALWAYS AS IDENTITY,
    user_id       BIGINT NOT NULL,
    name          VARCHAR(100) NOT NULL,
    blob          BYTEA NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_model
        PRIMARY KEY (id),

    CONSTRAINT fk_model_user
        FOREIGN KEY (user_id) REFERENCES app_user(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE DEFERRABLE,

    CONSTRAINT uq_model_name_user
        UNIQUE (user_id, name)
);

DROP TRIGGER IF EXISTS set_updated_at ON model;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON model
FOR EACH ROW
EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE IF NOT EXISTS signature (
    id           BIGINT GENERATED ALWAYS AS IDENTITY,
    model_id      BIGINT NOT NULL,
    input_signature JSONB NOT NULL,
    output_signature JSONB NOT NULL,
    version      BIGINT NOT NULL DEFAULT 1,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_signature
        PRIMARY KEY (id),
    CONSTRAINT fk_signature_model
        FOREIGN KEY (model_id) REFERENCES model(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE DEFERRABLE,

    CONSTRAINT uq_signature_model
        UNIQUE (model_id, input_signature, output_signature)
);

DROP TRIGGER IF EXISTS set_updated_at ON signature;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON signature
FOR EACH ROW
EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE IF NOT EXISTS prediction (
    id           BIGINT GENERATED ALWAYS AS IDENTITY,
    signature_id      BIGINT NOT NULL,
    data         JSONB NOT NULL,
    prediction   JSONB NOT NULL,
    real_value   JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_prediction
        PRIMARY KEY (id),
    CONSTRAINT fk_prediction_signature
        FOREIGN KEY (signature_id) REFERENCES signature(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE DEFERRABLE
);

DROP TRIGGER IF EXISTS set_updated_at ON prediction;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON prediction
FOR EACH ROW
EXECUTE FUNCTION trg_set_updated_at();