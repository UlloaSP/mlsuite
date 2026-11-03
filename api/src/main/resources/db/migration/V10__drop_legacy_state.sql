-- Every bundle carries a lock now, so no model runs in the frozen environment of bundles written
-- before locks (mlbundle 0.2.1), and the runtime no longer has it.
DELETE FROM runtime_environment WHERE environment_key = 'legacy';

-- Every result names the environment that computed it.
ALTER TABLE prediction_result ALTER COLUMN environment_key SET NOT NULL;

-- Publishing a draft records the snapshot it became.
ALTER TABLE schema_draft ADD CONSTRAINT ck_schema_draft_published_version
    CHECK (status <> 'PUBLISHED' OR published_version_id IS NOT NULL);
