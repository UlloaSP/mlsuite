-- Memberships and invitations are authorized only through role_definition_id.
-- Backfill any row that still relies on the legacy role enum before dropping it.

CREATE TEMPORARY TABLE legacy_role_permission (role varchar(32) NOT NULL, permission_key varchar(80) NOT NULL) ON COMMIT DROP;

INSERT INTO legacy_role_permission (role, permission_key)
SELECT 'OWNER', permission_key FROM unnest(ARRAY[
    'VIEW_WORKSPACE','VIEW_ORGANIZATION','EDIT_ORGANIZATION','DELETE_ORGANIZATION','TRANSFER_OWNERSHIP',
    'VIEW_MEMBERS','INVITE_MEMBERS','MANAGE_MEMBER_ROLES','REMOVE_MEMBERS','VIEW_INVITATIONS',
    'MANAGE_INVITATIONS','VIEW_MODELS','CREATE_MODELS','EDIT_MODELS','DELETE_MODELS','RUN_PREDICTIONS',
    'EXPORT_PREDICTIONS','REVIEW','MANAGE_REVIEWS','VIEW_PLUGINS','MANAGE_PLUGINS','VIEW_AUDIT_LOG']) AS permission_key
UNION ALL
SELECT 'ADMIN', permission_key FROM unnest(ARRAY[
    'VIEW_WORKSPACE','VIEW_ORGANIZATION','EDIT_ORGANIZATION',
    'VIEW_MEMBERS','INVITE_MEMBERS','MANAGE_MEMBER_ROLES','REMOVE_MEMBERS','VIEW_INVITATIONS',
    'MANAGE_INVITATIONS','VIEW_MODELS','CREATE_MODELS','EDIT_MODELS','DELETE_MODELS','RUN_PREDICTIONS',
    'EXPORT_PREDICTIONS','REVIEW','MANAGE_REVIEWS','VIEW_PLUGINS','MANAGE_PLUGINS','VIEW_AUDIT_LOG']) AS permission_key
UNION ALL
SELECT 'MEMBER', permission_key FROM unnest(ARRAY[
    'VIEW_WORKSPACE','VIEW_ORGANIZATION','VIEW_MODELS','CREATE_MODELS','EDIT_MODELS','DELETE_MODELS',
    'RUN_PREDICTIONS','VIEW_PLUGINS']) AS permission_key
UNION ALL
SELECT 'VIEWER', permission_key FROM unnest(ARRAY[
    'VIEW_WORKSPACE','VIEW_ORGANIZATION','VIEW_MODELS','VIEW_PLUGINS']) AS permission_key;

-- Create the organization's system role when a legacy assignment needs it and it does not exist yet.
INSERT INTO role_definition (locked, created_at, updated_at, organization_id, scope, system_key, name, slug, description)
SELECT DISTINCT true, now(), now(), legacy.organization_id, 'ORGANIZATION', legacy.role,
       initcap(lower(legacy.role)), lower(legacy.role), initcap(lower(legacy.role))
FROM (
    SELECT organization_id, role FROM organization_membership WHERE role_definition_id IS NULL
    UNION
    SELECT organization_id, role FROM invitation WHERE role_definition_id IS NULL
) legacy
WHERE NOT EXISTS (
    SELECT 1 FROM role_definition existing
    WHERE existing.organization_id = legacy.organization_id AND existing.system_key = legacy.role
);

-- System roles always carry at least their legacy permissions, as RoleSeedService enforces at startup.
INSERT INTO role_permission (role_definition_id, permission_key)
SELECT definition.id, permission.permission_key
FROM role_definition definition
JOIN legacy_role_permission permission ON permission.role = definition.system_key
WHERE definition.organization_id IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE organization_membership membership
SET role_definition_id = definition.id
FROM role_definition definition
WHERE membership.role_definition_id IS NULL
  AND definition.organization_id = membership.organization_id
  AND definition.system_key = membership.role;

UPDATE invitation
SET role_definition_id = definition.id
FROM role_definition definition
WHERE invitation.role_definition_id IS NULL
  AND definition.organization_id = invitation.organization_id
  AND definition.system_key = invitation.role;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM organization_membership WHERE role_definition_id IS NULL)
        OR EXISTS (SELECT 1 FROM invitation WHERE role_definition_id IS NULL) THEN
        RAISE EXCEPTION 'Legacy role backfill left memberships or invitations without role_definition_id';
    END IF;
END $$;

ALTER TABLE organization_membership ALTER COLUMN role_definition_id SET NOT NULL;
ALTER TABLE invitation ALTER COLUMN role_definition_id SET NOT NULL;
ALTER TABLE organization_membership DROP COLUMN role;
ALTER TABLE invitation DROP COLUMN role;
