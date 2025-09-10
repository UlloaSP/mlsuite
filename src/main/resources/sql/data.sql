-- 1. Fila reservada para procesos automáticos
INSERT INTO
    app_user (
        username,
        email,
        oauth_provider,
        oauth_id,
        avatar_url,
    )
SELECT
    'SYSTEM',
    'system@localhost',
    0,
    0,
    'System',
    NULL,
WHERE
    NOT EXISTS (
        SELECT
            1
        FROM
            app_user
        WHERE
            username = 'SYSTEM'
    );