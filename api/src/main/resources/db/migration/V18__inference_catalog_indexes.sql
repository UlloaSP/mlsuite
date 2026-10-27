-- The inference catalog filters runs by bookmark and pages them by creation time, newest first
-- and then by id; a model's results are looked up when it is deleted or archived.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prediction_run_bookmark
    ON prediction_run (schema_bookmark_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prediction_run_created
    ON prediction_run (created_at DESC, id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prediction_result_model
    ON prediction_result (model_id);
