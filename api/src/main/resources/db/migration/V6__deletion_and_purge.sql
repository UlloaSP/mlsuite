-- Deleting a person never takes their organization's data with it: what they wrote stays, authored
-- by nobody, and the API names that author "Deleted user". What was theirs alone leaves with them.
ALTER TABLE organization
    ALTER COLUMN created_by_user_id DROP NOT NULL,
    DROP CONSTRAINT fk_organization_creator,
    ADD CONSTRAINT fk_organization_creator FOREIGN KEY (created_by_user_id) REFERENCES app_user ON DELETE SET NULL,
    DROP CONSTRAINT fk_organization_updated_by,
    ADD CONSTRAINT fk_organization_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES app_user ON DELETE SET NULL;

ALTER TABLE role_definition
    DROP CONSTRAINT fk_role_created_by,
    ADD CONSTRAINT fk_role_created_by FOREIGN KEY (created_by_user_id) REFERENCES app_user ON DELETE SET NULL;

ALTER TABLE invitation
    ALTER COLUMN invited_by_user_id DROP NOT NULL,
    DROP CONSTRAINT fk_invitation_invited_by,
    ADD CONSTRAINT fk_invitation_invited_by FOREIGN KEY (invited_by_user_id) REFERENCES app_user ON DELETE SET NULL;

ALTER TABLE model
    ALTER COLUMN user_id DROP NOT NULL,
    DROP CONSTRAINT fk_model_user,
    ADD CONSTRAINT fk_model_user FOREIGN KEY (user_id) REFERENCES app_user ON DELETE SET NULL,
    DROP CONSTRAINT fk_model_updated_by,
    ADD CONSTRAINT fk_model_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES app_user ON DELETE SET NULL;

ALTER TABLE plugin_metadata
    DROP CONSTRAINT fk_plugin_metadata_updated_by,
    ADD CONSTRAINT fk_plugin_metadata_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES app_user ON DELETE SET NULL;

ALTER TABLE schema_artifact
    DROP CONSTRAINT fk_schema_artifact_created_by,
    ADD CONSTRAINT fk_schema_artifact_created_by FOREIGN KEY (created_by) REFERENCES app_user ON DELETE SET NULL,
    DROP CONSTRAINT fk_schema_artifact_updated_by,
    ADD CONSTRAINT fk_schema_artifact_updated_by FOREIGN KEY (updated_by) REFERENCES app_user ON DELETE SET NULL;

ALTER TABLE schema_draft
    DROP CONSTRAINT fk_schema_draft_updated_by,
    ADD CONSTRAINT fk_schema_draft_updated_by FOREIGN KEY (updated_by) REFERENCES app_user ON DELETE SET NULL;

ALTER TABLE schema_review
    ALTER COLUMN created_by_user_id DROP NOT NULL,
    DROP CONSTRAINT fk_schema_review_creator,
    ADD CONSTRAINT fk_schema_review_creator FOREIGN KEY (created_by_user_id) REFERENCES app_user ON DELETE SET NULL;

-- A reviewer who is gone has nothing left to do in a review; the answers they gave stay in it.
ALTER TABLE schema_review_assignee
    DROP CONSTRAINT fk_review_assignee_user,
    ADD CONSTRAINT fk_review_assignee_user FOREIGN KEY (user_id) REFERENCES app_user ON DELETE CASCADE;

ALTER TABLE schema_review_run_submission
    DROP CONSTRAINT fk_schema_review_submission_user,
    ADD CONSTRAINT fk_schema_review_submission_user FOREIGN KEY (user_id) REFERENCES app_user ON DELETE CASCADE;

-- An answer is by a member, by a visitor, or by neither once its member is gone.
ALTER TABLE prediction_result_feedback
    DROP CONSTRAINT ck_result_feedback_author,
    ADD CONSTRAINT ck_result_feedback_author CHECK (user_id IS NULL OR visitor_id IS NULL),
    DROP CONSTRAINT fk_result_feedback_user,
    ADD CONSTRAINT fk_result_feedback_user FOREIGN KEY (user_id) REFERENCES app_user ON DELETE SET NULL;

ALTER TABLE prediction_job
    ALTER COLUMN created_by_user_id DROP NOT NULL,
    DROP CONSTRAINT prediction_job_created_by_user_id_fkey,
    ADD CONSTRAINT prediction_job_created_by_user_id_fkey
        FOREIGN KEY (created_by_user_id) REFERENCES app_user (id) ON DELETE SET NULL;

-- A run outlives the bookmark it was made from; the bookmark is only how it was reached.
ALTER TABLE prediction_run
    DROP CONSTRAINT fk_prediction_run_bookmark,
    ADD CONSTRAINT fk_prediction_run_bookmark FOREIGN KEY (schema_bookmark_id) REFERENCES schema_bookmark ON DELETE SET NULL;

-- An answer removed with its run leaves one DELETED revision, so the removal stays on record once
-- the result is gone: the revision keeps the result's id as a plain value, and goes with the
-- snapshot it belongs to. What the answer said goes with the run.
ALTER TABLE prediction_result_feedback_revision
    DROP CONSTRAINT fk_feedback_revision_result,
    ADD COLUMN schema_version_id BIGINT;

UPDATE prediction_result_feedback_revision revision SET schema_version_id = run.schema_version_id
    FROM prediction_result result JOIN prediction_run run ON run.id = result.prediction_run_id
    WHERE result.id = revision.prediction_result_id;

ALTER TABLE prediction_result_feedback_revision
    ALTER COLUMN schema_version_id SET NOT NULL,
    ADD CONSTRAINT fk_feedback_revision_version FOREIGN KEY (schema_version_id) REFERENCES schema_version (id) ON DELETE CASCADE;

CREATE INDEX idx_feedback_revision_version ON prediction_result_feedback_revision (schema_version_id);

-- What deletes one row at a time looks up: the runs a deleted person's name stands on, their
-- answers and models, and everything a run's or a result's deletion has to find.
CREATE INDEX idx_prediction_run_created_by ON prediction_run (created_by_email) WHERE created_by_email IS NOT NULL;
CREATE INDEX idx_result_feedback_user ON prediction_result_feedback (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_result_feedback_result ON prediction_result_feedback (prediction_result_id);
CREATE INDEX idx_model_user ON model (user_id);
CREATE INDEX idx_schema_review_run_prediction ON schema_review_run (prediction_run_id);
CREATE INDEX idx_api_request_run ON api_request (prediction_run_id);
CREATE INDEX idx_api_request_bookmark ON api_request (schema_bookmark_id);
CREATE INDEX idx_prediction_job_row_run ON prediction_job_row (prediction_run_id);
CREATE INDEX idx_prediction_job_version ON prediction_job (schema_version_id);

-- A superadmin's cascade purge, run on the server like a bulk job: workers claim a job with
-- SELECT ... FOR UPDATE SKIP LOCKED under a lease, delete in small transactions and write down the
-- phase they reached, so a job whose worker crashed is claimed again and goes on from there. A
-- failed purge keeps its target closed until it is retried. An entry may outlive what it names and
-- who asked for it, so it references neither.
CREATE TABLE purge_job (id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    scope VARCHAR(16) NOT NULL CONSTRAINT ck_purge_job_scope CHECK (scope IN ('ORGANIZATION', 'USER', 'SCHEMA', 'MODEL')),
    target_id BIGINT NOT NULL, target_label VARCHAR(255) NOT NULL,
    -- The organization the job deletes, or the target lives in; for a user, their personal account.
    organization_id BIGINT NOT NULL,
    requested_by_user_id BIGINT, requested_by_label VARCHAR(255) NOT NULL,
    status VARCHAR(16) NOT NULL CONSTRAINT ck_purge_job_status CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')),
    phase VARCHAR(32) NOT NULL, counts JSONB NOT NULL DEFAULT '{}'::jsonb, error VARCHAR(2000),
    lease_owner VARCHAR(128), lease_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL, finished_at TIMESTAMPTZ);

CREATE UNIQUE INDEX uq_purge_job_open ON purge_job (scope, target_id) WHERE status <> 'COMPLETED';
CREATE INDEX idx_purge_job_claim ON purge_job (id) WHERE status IN ('QUEUED', 'RUNNING');
CREATE INDEX idx_purge_job_recent ON purge_job (id DESC);

-- The snapshots a job destroys, fixed when it starts: a phase that removes what chose them cannot
-- lose the rest, and every later phase reads the same set.
CREATE TABLE purge_job_version (job_id BIGINT NOT NULL REFERENCES purge_job (id) ON DELETE CASCADE,
    schema_version_id BIGINT NOT NULL, PRIMARY KEY (job_id, schema_version_id));

CREATE INDEX idx_purge_job_version_version ON purge_job_version (schema_version_id);

-- Set under the target's lock when a purge is asked for, and never cleared: the target goes.
ALTER TABLE organization ADD COLUMN purging_at TIMESTAMPTZ;
ALTER TABLE schema_artifact ADD COLUMN purging_at TIMESTAMPTZ;
ALTER TABLE model ADD COLUMN purging_at TIMESTAMPTZ;

-- One task per stored version of an object, or one with no version for every version of a key.
ALTER TABLE storage_deletion_task
    DROP CONSTRAINT uq_storage_deletion_object,
    ADD CONSTRAINT uq_storage_deletion_object UNIQUE NULLS NOT DISTINCT (bucket, object_key, object_version_id);

CREATE INDEX idx_storage_deletion_key ON storage_deletion_task (bucket, object_key);
CREATE INDEX idx_storage_deletion_completed ON storage_deletion_task (completed_at) WHERE status = 'COMPLETED';
