-- Visitor runs kept each classifier report as the runtime answered it (one row of probabilities
-- per instance, no predicted class). Every reader expects what a workspace run stores: the
-- instance's own row, its class labels and its predicted class.
UPDATE prediction_result AS result
SET output_json = jsonb_set(result.output_json, '{reports}', (
    SELECT jsonb_agg(
        CASE
            WHEN report ? 'mappedTo'
                AND report ->> 'kind' = 'classifier'
                AND jsonb_typeof(report -> 'probabilities' -> 0) = 'array'
            THEN report || jsonb_strip_nulls(jsonb_build_object(
                'probabilities', report -> 'probabilities' -> 0,
                'labels', CASE WHEN jsonb_typeof(report -> 'mapping') = 'array' THEN report -> 'mapping' END,
                'prediction', (
                    SELECT report -> 'mapping' ->> (probability.position - 1)::int
                    FROM jsonb_array_elements(report -> 'probabilities' -> 0)
                        WITH ORDINALITY AS probability(value, position)
                    WHERE jsonb_typeof(report -> 'mapping') = 'array'
                        AND jsonb_typeof(probability.value) = 'number'
                    ORDER BY (probability.value #>> '{}')::numeric DESC, probability.position
                    LIMIT 1)))
            ELSE report
        END
        ORDER BY position)
    FROM jsonb_array_elements(result.output_json -> 'reports') WITH ORDINALITY AS stored(report, position)))
FROM prediction_run AS run
WHERE run.id = result.prediction_run_id
    AND run.origin = 'PUBLIC'
    AND jsonb_typeof(result.output_json -> 'reports') = 'array'
    AND jsonb_array_length(result.output_json -> 'reports') > 0;
