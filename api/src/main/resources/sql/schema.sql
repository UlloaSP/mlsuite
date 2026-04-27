CREATE TABLE IF NOT EXISTS app_user (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255),
    auth_provider VARCHAR(32) NOT NULL DEFAULT 'LOCAL',
    account_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    email_verified BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    oauth_provider SMALLINT,
    oauth_id VARCHAR(255),
    avatar_url TEXT,
    full_name VARCHAR(150) NOT NULL,
    is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_app_user_email UNIQUE (email),
    CONSTRAINT uq_app_user_username UNIQUE (username)
);

CREATE TABLE IF NOT EXISTS organization (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    billing_plan VARCHAR(50) NOT NULL DEFAULT 'free',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_organization_slug UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS organization_user (
    organization_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_organization_user PRIMARY KEY (organization_id, user_id),
    CONSTRAINT fk_organization_user_organization FOREIGN KEY (organization_id) REFERENCES organization (id) ON DELETE CASCADE,
    CONSTRAINT fk_organization_user_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS permission_group (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS permission (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id INT NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    CONSTRAINT fk_permission_group FOREIGN KEY (group_id) REFERENCES permission_group (id) ON DELETE CASCADE,
    CONSTRAINT uq_permission_resource_action UNIQUE (resource, action)
);

CREATE TABLE IF NOT EXISTS role_template (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_role_template_name UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS role (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    template_id INT,
    name VARCHAR(50) NOT NULL,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_role_organization FOREIGN KEY (organization_id) REFERENCES organization (id) ON DELETE CASCADE,
    CONSTRAINT fk_role_template FOREIGN KEY (template_id) REFERENCES role_template (id) ON DELETE SET NULL,
    CONSTRAINT uq_role_organization_name UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS role_permission (
    role_id BIGINT NOT NULL,
    permission_id INT NOT NULL,
    CONSTRAINT pk_role_permission PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permission_role FOREIGN KEY (role_id) REFERENCES role (id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permission_permission FOREIGN KEY (permission_id) REFERENCES permission (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_role (
    organization_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    CONSTRAINT pk_user_role PRIMARY KEY (organization_id, user_id, role_id),
    CONSTRAINT fk_user_role_organization FOREIGN KEY (organization_id) REFERENCES organization (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_role_role FOREIGN KEY (role_id) REFERENCES role (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS model (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    created_by BIGINT,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(255) NOT NULL,
    specific_type VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    model_file BYTEA NOT NULL DEFAULT '\x',
    storage_bucket VARCHAR(100),
    storage_object_key VARCHAR(512),
    storage_etag VARCHAR(128),
    model_size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_model_organization FOREIGN KEY (organization_id) REFERENCES organization (id) ON DELETE CASCADE,
    CONSTRAINT fk_model_created_by FOREIGN KEY (created_by) REFERENCES app_user (id) ON DELETE SET NULL,
    CONSTRAINT uq_model_name_organization UNIQUE (name, organization_id)
);

CREATE TABLE IF NOT EXISTS signature (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    major INT NOT NULL,
    minor INT NOT NULL,
    patch INT NOT NULL,
    origin BIGINT,
    input_signature JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_signature_model FOREIGN KEY (model_id) REFERENCES model (id) ON DELETE CASCADE,
    CONSTRAINT fk_signature_organization FOREIGN KEY (organization_id) REFERENCES organization (id) ON DELETE CASCADE,
    CONSTRAINT fk_origin_signature FOREIGN KEY (origin) REFERENCES signature (id) ON DELETE SET NULL,
    CONSTRAINT ck_signature_version CHECK (major >= 0 AND minor >= 0 AND patch >= 0),
    CONSTRAINT uq_signature_model UNIQUE (model_id, input_signature),
    CONSTRAINT uq_version_signature UNIQUE (model_id, major, minor, patch)
);

CREATE TABLE IF NOT EXISTS prediction (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    signature_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    executed_by BIGINT,
    name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    prediction JSONB NOT NULL,
    status SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prediction_signature FOREIGN KEY (signature_id) REFERENCES signature (id) ON DELETE CASCADE,
    CONSTRAINT fk_prediction_organization FOREIGN KEY (organization_id) REFERENCES organization (id) ON DELETE CASCADE,
    CONSTRAINT fk_prediction_executed_by FOREIGN KEY (executed_by) REFERENCES app_user (id) ON DELETE SET NULL,
    CONSTRAINT uq_prediction_signature_name UNIQUE (signature_id, name)
);

CREATE TABLE IF NOT EXISTS target (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    prediction_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    orden INT NOT NULL,
    data_value JSONB NOT NULL,
    real_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_target_prediction FOREIGN KEY (prediction_id) REFERENCES prediction (id) ON DELETE CASCADE,
    CONSTRAINT fk_target_organization FOREIGN KEY (organization_id) REFERENCES organization (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS output_feedback (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    prediction_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    orden INT NOT NULL,
    data_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_output_feedback_prediction FOREIGN KEY (prediction_id) REFERENCES prediction (id) ON DELETE CASCADE,
    CONSTRAINT fk_output_feedback_organization FOREIGN KEY (organization_id) REFERENCES organization (id) ON DELETE CASCADE,
    CONSTRAINT uq_output_feedback_prediction_order UNIQUE (prediction_id, orden)
);

CREATE TABLE IF NOT EXISTS explanation_feedback (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    prediction_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    orden INT NOT NULL,
    data_value JSONB NOT NULL,
    real_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_explanation_feedback_prediction FOREIGN KEY (prediction_id) REFERENCES prediction (id) ON DELETE CASCADE,
    CONSTRAINT fk_explanation_feedback_organization FOREIGN KEY (organization_id) REFERENCES organization (id) ON DELETE CASCADE,
    CONSTRAINT uq_explanation_feedback_prediction_order UNIQUE (prediction_id, orden)
);

ALTER TABLE app_user ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(32) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS account_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE model ADD COLUMN IF NOT EXISTS organization_id BIGINT;
ALTER TABLE model ADD COLUMN IF NOT EXISTS created_by BIGINT;
ALTER TABLE signature ADD COLUMN IF NOT EXISTS organization_id BIGINT;
ALTER TABLE prediction ADD COLUMN IF NOT EXISTS organization_id BIGINT;
ALTER TABLE prediction ADD COLUMN IF NOT EXISTS executed_by BIGINT;
ALTER TABLE target ADD COLUMN IF NOT EXISTS organization_id BIGINT;
ALTER TABLE output_feedback ADD COLUMN IF NOT EXISTS organization_id BIGINT;
ALTER TABLE explanation_feedback ADD COLUMN IF NOT EXISTS organization_id BIGINT;

UPDATE app_user
SET auth_provider = 'LOCAL'
WHERE auth_provider IS NULL OR auth_provider = '';

UPDATE app_user
SET account_status = 'ACTIVE'
WHERE account_status IS NULL OR account_status = '';

UPDATE app_user
SET email_verified = TRUE
WHERE email_verified IS NULL;

INSERT INTO organization (name, slug, billing_plan, status)
SELECT COALESCE(NULLIF(u.full_name, ''), u.username) || ' Workspace', u.username || '-' || u.id, 'free', 'ACTIVE'
FROM app_user u
WHERE NOT EXISTS (SELECT 1 FROM organization o WHERE o.slug = u.username || '-' || u.id);

INSERT INTO organization_user (organization_id, user_id, status, joined_at)
SELECT o.id, u.id, 'ACTIVE', CURRENT_TIMESTAMP
FROM app_user u
JOIN organization o ON o.slug = u.username || '-' || u.id
WHERE NOT EXISTS (
    SELECT 1 FROM organization_user ou WHERE ou.organization_id = o.id AND ou.user_id = u.id
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'model' AND column_name = 'user_id') THEN
        EXECUTE 'UPDATE model m SET created_by = COALESCE(created_by, user_id) WHERE created_by IS NULL';
        EXECUTE 'UPDATE model m SET organization_id = o.id FROM app_user u JOIN organization o ON o.slug = u.username || ''-'' || u.id WHERE m.organization_id IS NULL AND m.user_id = u.id';
    END IF;
END $$;

UPDATE signature s
SET organization_id = m.organization_id
FROM model m
WHERE s.model_id = m.id AND s.organization_id IS NULL;

UPDATE prediction p
SET organization_id = s.organization_id,
    executed_by = COALESCE(p.executed_by, m.created_by)
FROM signature s
JOIN model m ON m.id = s.model_id
WHERE p.signature_id = s.id AND p.organization_id IS NULL;

UPDATE target t
SET organization_id = p.organization_id
FROM prediction p
WHERE t.prediction_id = p.id AND t.organization_id IS NULL;

UPDATE output_feedback f
SET organization_id = p.organization_id
FROM prediction p
WHERE f.prediction_id = p.id AND f.organization_id IS NULL;

UPDATE explanation_feedback f
SET organization_id = p.organization_id
FROM prediction p
WHERE f.prediction_id = p.id AND f.organization_id IS NULL;
