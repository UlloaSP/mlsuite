-- The inferences table sorts by values derived from stored runs (inputs, reports, answers) in the
-- order the API's ICU collation gives their displayed text, per locale. Those sort keys are kept
-- here, computed by the API itself, so a derived sort is paged by the database: text_key holds the
-- ICU collation key bytes, whose byte order is the collator's order, and number_value a number.
-- Rows are filled the first time a locale sorts a run (runs predate any locale), and a run's keys
-- are computed again once a newer answer revision exists for it (revision_mark).
CREATE TABLE inference_sort_run (
    locale TEXT NOT NULL,
    prediction_run_id BIGINT NOT NULL REFERENCES prediction_run (id) ON DELETE CASCADE,
    revision_mark BIGINT NOT NULL,
    PRIMARY KEY (locale, prediction_run_id)
);

CREATE TABLE inference_sort_key (
    locale TEXT NOT NULL,
    column_id TEXT NOT NULL,
    prediction_run_id BIGINT NOT NULL REFERENCES prediction_run (id) ON DELETE CASCADE,
    number_value DOUBLE PRECISION,
    text_key BYTEA,
    PRIMARY KEY (locale, column_id, prediction_run_id),
    CHECK ((number_value IS NULL) <> (text_key IS NULL))
);

CREATE INDEX idx_inference_sort_key_run ON inference_sort_key (prediction_run_id);
