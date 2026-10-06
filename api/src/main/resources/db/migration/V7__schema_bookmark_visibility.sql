-- A bookmark is private until a member publishes it. public_id is assigned on the first
-- publish and kept afterwards, so a shared /explore link survives unpublishing.
ALTER TABLE schema_bookmark
    ADD COLUMN visibility VARCHAR(16) NOT NULL DEFAULT 'PRIVATE',
    ADD COLUMN public_id VARCHAR(36),
    ADD CONSTRAINT ck_schema_bookmark_visibility CHECK (visibility IN ('PRIVATE', 'PUBLIC')),
    ADD CONSTRAINT ck_schema_bookmark_public_has_id CHECK (visibility = 'PRIVATE' OR public_id IS NOT NULL),
    ADD CONSTRAINT uq_schema_bookmark_public_id UNIQUE (public_id);

-- PUBLISH_BOOKMARKS joins the permission catalog. RoleSeedService grants it to each
-- organization's OWNER and ADMIN system roles at startup, as it does for every new permission.
ALTER TABLE role_permission DROP CONSTRAINT role_permission_permission_key_check;
ALTER TABLE role_permission ADD CONSTRAINT role_permission_permission_key_check CHECK (permission_key IN (
    'VIEW_WORKSPACE','VIEW_ORGANIZATION','EDIT_ORGANIZATION','DELETE_ORGANIZATION','TRANSFER_OWNERSHIP',
    'VIEW_MEMBERS','INVITE_MEMBERS','MANAGE_MEMBER_ROLES','REMOVE_MEMBERS','VIEW_INVITATIONS',
    'MANAGE_INVITATIONS','VIEW_MODELS','CREATE_MODELS','EDIT_MODELS','DELETE_MODELS','RUN_PREDICTIONS',
    'EXPORT_PREDICTIONS','PUBLISH_BOOKMARKS','REVIEW','MANAGE_REVIEWS','VIEW_PLUGINS','MANAGE_PLUGINS',
    'VIEW_AUDIT_LOG'));

ALTER TABLE role_template_permission DROP CONSTRAINT role_template_permission_permission_key_check;
ALTER TABLE role_template_permission ADD CONSTRAINT role_template_permission_permission_key_check CHECK (permission_key IN (
    'VIEW_WORKSPACE','VIEW_ORGANIZATION','EDIT_ORGANIZATION','DELETE_ORGANIZATION','TRANSFER_OWNERSHIP',
    'VIEW_MEMBERS','INVITE_MEMBERS','MANAGE_MEMBER_ROLES','REMOVE_MEMBERS','VIEW_INVITATIONS',
    'MANAGE_INVITATIONS','VIEW_MODELS','CREATE_MODELS','EDIT_MODELS','DELETE_MODELS','RUN_PREDICTIONS',
    'EXPORT_PREDICTIONS','PUBLISH_BOOKMARKS','REVIEW','MANAGE_REVIEWS','VIEW_PLUGINS','MANAGE_PLUGINS',
    'VIEW_AUDIT_LOG'));
