-- A visitor is whoever runs a public bookmark without an account: a random id the API issues
-- in a browser cookie on their first run. A visitor's runs and feedback are kept for good and
-- told apart from the workspace's own by the run's origin.
CREATE TABLE visitor (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL
);

-- Where a run was made: the workspace form, or a bookmark's public page. Every run so far came
-- from the workspace. A public run by a visitor names them; one by a signed-in account names
-- the account as a workspace run does.
ALTER TABLE prediction_run ADD COLUMN origin VARCHAR(16) NOT NULL DEFAULT 'WORKSPACE'
    CONSTRAINT ck_prediction_run_origin CHECK (origin IN ('WORKSPACE', 'PUBLIC'));
ALTER TABLE prediction_run ALTER COLUMN origin DROP DEFAULT;
ALTER TABLE prediction_run ADD COLUMN visitor_id UUID
    CONSTRAINT fk_prediction_run_visitor REFERENCES visitor (id);
CREATE INDEX ix_prediction_run_visitor_bookmark ON prediction_run (visitor_id, schema_bookmark_id)
    WHERE visitor_id IS NOT NULL;

-- Feedback on a result is given by a member or by a visitor, never by both, and each gives one
-- answer per result, type and order.
ALTER TABLE prediction_result_feedback ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE prediction_result_feedback ADD COLUMN visitor_id UUID
    CONSTRAINT fk_result_feedback_visitor REFERENCES visitor (id);
ALTER TABLE prediction_result_feedback ADD CONSTRAINT ck_result_feedback_author
    CHECK ((user_id IS NULL) <> (visitor_id IS NULL));
ALTER TABLE prediction_result_feedback DROP CONSTRAINT uq_result_feedback_type_order_user;
CREATE UNIQUE INDEX uq_result_feedback_type_order_user
    ON prediction_result_feedback (prediction_result_id, feedback_type, orden, user_id)
    WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX uq_result_feedback_type_order_visitor
    ON prediction_result_feedback (prediction_result_id, feedback_type, orden, visitor_id)
    WHERE visitor_id IS NOT NULL;
