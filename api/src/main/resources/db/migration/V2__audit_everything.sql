-- The audit log now records every action, by people and by the system. An entry outlives the user
-- and the organization it names, so it keeps their ids without a foreign key, and their names as
-- they were when it was written; deleting either is no longer blocked by its entries.
ALTER TABLE audit_event
    DROP CONSTRAINT fk_audit_org,
    DROP CONSTRAINT fk_audit_actor,
    ALTER COLUMN organization_id DROP NOT NULL,
    ALTER COLUMN actor_user_id DROP NOT NULL,
    ALTER COLUMN metadata TYPE JSONB USING
        CASE WHEN metadata IS NULL THEN NULL ELSE jsonb_build_object('detail', metadata) END,
    ADD COLUMN actor_kind VARCHAR(20) NOT NULL DEFAULT 'USER'
        CONSTRAINT ck_audit_actor_kind CHECK (actor_kind IN ('USER', 'SYSTEM', 'API_CLIENT', 'VISITOR')),
    ADD COLUMN actor_label VARCHAR(255),
    ADD COLUMN organization_label VARCHAR(255),
    ADD COLUMN ip VARCHAR(64),
    ADD COLUMN request_id UUID;

UPDATE audit_event e SET actor_label = u.full_name FROM app_user u WHERE u.id = e.actor_user_id;
UPDATE audit_event e SET organization_label = o.name FROM organization o WHERE o.id = e.organization_id;

ALTER TABLE audit_event
    ALTER COLUMN actor_label SET NOT NULL,
    ALTER COLUMN actor_kind DROP DEFAULT;

-- The platform-wide catalog, and the retention job's oldest-first scan.
CREATE INDEX idx_audit_event_created ON audit_event (created_at DESC, id DESC);

-- Which organization a queued deletion belongs to, for the entry that reports it failing for good.
ALTER TABLE storage_deletion_task ADD COLUMN organization_id BIGINT;
