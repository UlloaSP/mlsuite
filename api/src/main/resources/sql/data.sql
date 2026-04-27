INSERT INTO app_user (
    username,
    email,
    password_hash,
    auth_provider,
    account_status,
    email_verified,
    avatar_url,
    full_name,
    is_superadmin
)
SELECT
    'SYSTEM',
    'system@localhost',
    '$2a$12$UEuM3YxWg8p6vJvEOi33EuN4jArtyTc95xJMu38xpv8uKXu95syE6',
    'LOCAL',
    'ACTIVE',
    TRUE,
    NULL,
    'System',
    TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM app_user
    WHERE LOWER(email) = 'system@localhost'
);
