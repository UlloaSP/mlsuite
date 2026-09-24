ALTER TABLE storage_deletion_task
    ADD COLUMN processing_started_at TIMESTAMPTZ,
    ADD COLUMN processing_token VARCHAR(128);

ALTER TABLE storage_deletion_task
    DROP CONSTRAINT ck_storage_deletion_status,
    ADD CONSTRAINT ck_storage_deletion_status
        CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED'));

CREATE INDEX idx_storage_deletion_lease
    ON storage_deletion_task (status, processing_started_at, id);
