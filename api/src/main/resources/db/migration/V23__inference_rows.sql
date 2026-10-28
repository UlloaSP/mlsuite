-- The inferences table's columns and sorts are derived from stored runs (inputs, reports, answers).
-- V22 kept a sort key per locale, filled the first time a locale sorted a scope, which made that
-- request project and store every run of it. What a run shows does not depend on the locale, only
-- how it is written and compared does, so each run's projection is kept once instead, by a
-- background refresh, and every locale formats and collates it when it reads it.
DROP TABLE inference_sort_key;
DROP TABLE inference_sort_run;

-- One row per run: the raw value of each of its data columns, its feedback status, and a digest of
-- its columns' ids and groups (runs sharing one have the same columns), as projection_version
-- projects them with its snapshot's models named as models_stamp says. Every change of the run's
-- answers adds one to answer_changes, in the same transaction (a row may exist for that alone,
-- before it is projected); the projection is current while projected_changes still equals it.
-- A migration that changes answers or what a row is projected from must empty this table.
CREATE TABLE inference_row (
    prediction_run_id BIGINT PRIMARY KEY REFERENCES prediction_run (id) ON DELETE CASCADE,
    answer_changes BIGINT NOT NULL DEFAULT 0,
    projected_changes BIGINT,
    projection_version INTEGER,
    schema_version_id BIGINT,
    models_stamp TEXT,
    layout TEXT,
    feedback_status VARCHAR(32),
    cell_values JSONB,
    CONSTRAINT ck_inference_row_projected CHECK (num_nulls(projected_changes, projection_version, schema_version_id,
        models_stamp, layout, feedback_status, cell_values) IN (0, 7))
);
