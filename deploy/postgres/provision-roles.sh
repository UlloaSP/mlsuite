#!/usr/bin/env sh
set -eu

: "${DB_USER:?DB_USER is required}"
: "${DB_PASS:?DB_PASS is required}"
: "${DB_MIGRATION_USER:?DB_MIGRATION_USER is required}"
: "${DB_MIGRATION_PASS:?DB_MIGRATION_PASS is required}"

if [ "$DB_USER" = "$DB_MIGRATION_USER" ] && [ "$DB_PASS" != "$DB_MIGRATION_PASS" ]; then
  echo "DB_PASS and DB_MIGRATION_PASS must match when both roles use the same name" >&2
  exit 1
fi

# Runs as the administrator PostgreSQL bootstrapped the volume with (PGUSER).
psql --set=ON_ERROR_STOP=1 \
  --set=app_user="$DB_USER" \
  --set=app_pass="$DB_PASS" \
  --set=migration_user="$DB_MIGRATION_USER" \
  --set=migration_pass="$DB_MIGRATION_PASS" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_pass')
WHERE :'app_user' <> current_user
  AND NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'app_user')
\gexec
SELECT format('ALTER ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_pass')
WHERE :'app_user' <> current_user
\gexec

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'migration_user', :'migration_pass')
WHERE :'migration_user' <> current_user
  AND NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'migration_user')
\gexec
SELECT format('ALTER ROLE %I LOGIN PASSWORD %L', :'migration_user', :'migration_pass')
WHERE :'migration_user' <> current_user
\gexec

SELECT format('ALTER SCHEMA public OWNER TO %I', :'migration_user')
\gexec

SELECT format('GRANT CONNECT, CREATE ON DATABASE %I TO %I', current_database(), :'migration_user')
\gexec
SELECT format('GRANT USAGE, CREATE ON SCHEMA public TO %I', :'migration_user')
\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'app_user')
\gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app_user')
\gexec
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', :'app_user')
\gexec
SELECT format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', :'app_user')
\gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', :'migration_user', :'app_user')
\gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', :'migration_user', :'app_user')
\gexec
SELECT format('ALTER ROLE %I NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', :'migration_user')
WHERE :'migration_user' <> current_user
\gexec
SELECT format('ALTER ROLE %I NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', :'app_user')
WHERE :'app_user' <> current_user
  AND :'app_user' <> :'migration_user'
\gexec
SQL
