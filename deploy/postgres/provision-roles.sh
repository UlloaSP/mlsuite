#!/usr/bin/env sh
set -eu

: "${DB_USER:?DB_USER is required}"
: "${DB_PASS:?DB_PASS is required}"
: "${DB_ADMIN_USER:?DB_ADMIN_USER is required}"
: "${DB_ADMIN_PASS:?DB_ADMIN_PASS is required}"
: "${DB_MIGRATION_USER:?DB_MIGRATION_USER is required}"
: "${DB_MIGRATION_PASS:?DB_MIGRATION_PASS is required}"
: "${DB_LEGACY_OWNER:?DB_LEGACY_OWNER is required}"
: "${DB_LEGACY_PASS:?DB_LEGACY_PASS is required}"

if [ "$DB_USER" = "$DB_MIGRATION_USER" ] && [ "$DB_PASS" != "$DB_MIGRATION_PASS" ]; then
  echo "DB_PASS and DB_MIGRATION_PASS must match when both roles use the same name" >&2
  exit 1
fi

# A reused pre-role-separation volume only knows the former DB_USER owner.
# Bootstrap through it once, then future runs authenticate as DB_ADMIN_USER.
if ! psql --no-password --tuples-only --command 'SELECT 1' >/dev/null 2>&1; then
  export PGUSER="$DB_LEGACY_OWNER"
  export PGPASSWORD="$DB_LEGACY_PASS"
  psql --no-password --tuples-only --command 'SELECT 1' >/dev/null
fi

psql --set=ON_ERROR_STOP=1 \
  --set=admin_user="$DB_ADMIN_USER" \
  --set=admin_pass="$DB_ADMIN_PASS" \
  --set=legacy_owner="$DB_LEGACY_OWNER" \
  --set=app_user="$DB_USER" \
  --set=app_pass="$DB_PASS" \
  --set=migration_user="$DB_MIGRATION_USER" \
  --set=migration_pass="$DB_MIGRATION_PASS" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN SUPERUSER PASSWORD %L', :'admin_user', :'admin_pass')
WHERE :'admin_user' <> current_user
  AND NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'admin_user')
\gexec
SELECT format('ALTER ROLE %I LOGIN SUPERUSER PASSWORD %L', :'admin_user', :'admin_pass')
WHERE :'admin_user' <> current_user
\gexec

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

SELECT format('ALTER TABLE %I.%I OWNER TO %I', schemaname, tablename, :'migration_user')
FROM pg_tables
WHERE schemaname = 'public' AND tableowner = :'legacy_owner' AND :'legacy_owner' <> :'migration_user'
\gexec
SELECT format('ALTER SEQUENCE %I.%I OWNER TO %I', sequence_schema, sequence_name, :'migration_user')
FROM information_schema.sequences
WHERE sequence_schema = 'public' AND sequence_name IN (
    SELECT c.relname FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner
    WHERE c.relkind = 'S' AND r.rolname = :'legacy_owner'
) AND :'legacy_owner' <> :'migration_user'
\gexec
SELECT format('ALTER DATABASE %I OWNER TO %I', current_database(), :'admin_user')
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
WHERE :'migration_user' <> :'admin_user'
\gexec
SQL

PGUSER="$DB_ADMIN_USER" PGPASSWORD="$DB_ADMIN_PASS" psql --set=ON_ERROR_STOP=1 \
  --set=app_user="$DB_USER" \
  --set=admin_user="$DB_ADMIN_USER" \
  --set=legacy_owner="$DB_LEGACY_OWNER" \
  --set=migration_user="$DB_MIGRATION_USER" <<'SQL'
SELECT format('ALTER ROLE %I NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', :'app_user')
WHERE :'app_user' <> :'admin_user'
  AND :'app_user' <> :'migration_user'
  AND (SELECT oid FROM pg_roles WHERE rolname = :'app_user') <> 10
\gexec
SELECT format('ALTER ROLE %I NOLOGIN', :'legacy_owner')
WHERE :'legacy_owner' <> :'admin_user'
  AND :'legacy_owner' <> :'app_user'
  AND :'legacy_owner' <> :'migration_user'
  AND EXISTS (SELECT FROM pg_roles WHERE rolname = :'legacy_owner')
\gexec
SELECT format('ALTER ROLE %I NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', :'legacy_owner')
WHERE :'legacy_owner' <> :'admin_user'
  AND :'legacy_owner' <> :'app_user'
  AND :'legacy_owner' <> :'migration_user'
  AND (SELECT oid FROM pg_roles WHERE rolname = :'legacy_owner') <> 10
\gexec
SQL
