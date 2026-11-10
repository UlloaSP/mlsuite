-- The environment every model the tests store runs in (TestFixtures.ENVIRONMENT_KEY).
INSERT INTO runtime_environment (environment_key, lock_digest, writer_version, python_version, packages,
    lock_toml, created_at)
VALUES (repeat('c', 64), repeat('d', 64), '0.3.1', '3.14.7',
    '[{"name": "scikit-learn", "version": "1.9.1"}]'::jsonb, 'lock-version = "1.0"', now())
ON CONFLICT (environment_key) DO NOTHING;
