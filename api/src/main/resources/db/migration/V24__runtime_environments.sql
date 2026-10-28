-- Every model runs in an environment: the Python and the distributions its bundle's lock names,
-- plus the mlbundle release that wrote it, which the runtime's builder installs once and every
-- model needing the same files shares. A row describes one environment for good, so a stored
-- result still says which Python and which library versions computed it after the environment's
-- files are removed. Bundles written before locks (mlbundle 0.2.1) run in the runtime's frozen
-- legacy environment, the one every model ran in until now.
CREATE TABLE runtime_environment (
    environment_key VARCHAR(64) PRIMARY KEY,
    -- mlbundle's identity of the lock (Python, packages and wheel digests); none for legacy.
    environment_id VARCHAR(64),
    writer_version VARCHAR(64) NOT NULL,
    python_version VARCHAR(32) NOT NULL,
    packages JSONB NOT NULL,
    -- The bundle's canonical pylock.toml, which the builder installs; none for legacy.
    lock_toml TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

INSERT INTO runtime_environment (environment_key, environment_id, writer_version, python_version, packages, lock_toml, created_at)
VALUES ('legacy', NULL, '0.2.1', '3.14', '[
        {"name": "annotated-types", "version": "0.8.0"},
        {"name": "catboost", "version": "1.2.10"},
        {"name": "cloudpickle", "version": "3.1.2"},
        {"name": "contourpy", "version": "1.4.0"},
        {"name": "cycler", "version": "0.12.1"},
        {"name": "flatbuffers", "version": "25.12.19"},
        {"name": "fonttools", "version": "4.66.1"},
        {"name": "graphviz", "version": "0.21"},
        {"name": "joblib", "version": "1.6.0"},
        {"name": "kiwisolver", "version": "1.5.1"},
        {"name": "matplotlib", "version": "3.11.2"},
        {"name": "ml-dtypes", "version": "0.6.0"},
        {"name": "narwhals", "version": "2.26.0"},
        {"name": "numpy", "version": "2.5.3"},
        {"name": "nvidia-nccl-cu13", "version": "2.32.3"},
        {"name": "onnx", "version": "1.23.0"},
        {"name": "onnxruntime", "version": "1.30.0"},
        {"name": "packaging", "version": "26.3"},
        {"name": "pandas", "version": "3.0.6"},
        {"name": "pillow", "version": "13.0.0"},
        {"name": "plotly", "version": "7.1.0"},
        {"name": "prettytable", "version": "3.18.0"},
        {"name": "protobuf", "version": "7.36.2"},
        {"name": "pydantic", "version": "2.13.5"},
        {"name": "pydantic-core", "version": "2.46.5"},
        {"name": "pyparsing", "version": "3.3.3"},
        {"name": "python-dateutil", "version": "2.9.0.post0"},
        {"name": "scikit-learn", "version": "1.9.1"},
        {"name": "scipy", "version": "1.18.1"},
        {"name": "six", "version": "1.17.0"},
        {"name": "skops", "version": "0.16.0"},
        {"name": "threadpoolctl", "version": "3.7.0"},
        {"name": "typing-extensions", "version": "4.16.0"},
        {"name": "typing-inspection", "version": "0.4.4"},
        {"name": "tzdata", "version": "2026.4"},
        {"name": "wcwidth", "version": "0.9.2"},
        {"name": "xgboost", "version": "3.4.1"}
    ]'::jsonb, NULL, now());

-- A model runs once its environment is built and the model has loaded there (READY); until then
-- it is PREPARING, claimed by one API instance at a time under a lease, or FAILED with the reason.
ALTER TABLE model
    ADD COLUMN environment_key VARCHAR(64) NOT NULL DEFAULT 'legacy'
        REFERENCES runtime_environment (environment_key),
    ADD COLUMN runtime_state VARCHAR(16) NOT NULL DEFAULT 'READY'
        CHECK (runtime_state IN ('PREPARING', 'READY', 'FAILED')),
    ADD COLUMN runtime_error VARCHAR(2000),
    ADD COLUMN runtime_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN runtime_lease_owner VARCHAR(128),
    ADD COLUMN runtime_lease_expires_at TIMESTAMPTZ;

ALTER TABLE model ALTER COLUMN environment_key DROP DEFAULT;
ALTER TABLE model ALTER COLUMN runtime_state DROP DEFAULT;

CREATE INDEX idx_model_runtime_preparing ON model (id) WHERE runtime_state = 'PREPARING';
CREATE INDEX idx_model_environment ON model (environment_key);

-- The environment that computed each result; none for results stored before environments.
ALTER TABLE prediction_result
    ADD COLUMN environment_key VARCHAR(64) REFERENCES runtime_environment (environment_key);
