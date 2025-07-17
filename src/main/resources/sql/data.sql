-- 1. Fila reservada para procesos automáticos
INSERT INTO
    app_user (
        username,
        email,
        oauth_provider,
        oauth_id,
        display_name,
        avatar_url,
        created_by,
        updated_by
    )
SELECT
    'SYSTEM',
    'system@localhost',
    0,
    0,
    'System',
    NULL,
    NULL,
    NULL
WHERE
    NOT EXISTS (
        SELECT
            1
        FROM
            app_user
        WHERE
            username = 'SYSTEM'
    );