CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_org_name_trgm
    ON organization USING GIN (lower(name) gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_org_slug_trgm
    ON organization USING GIN (lower(slug) gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_model_name_trgm
    ON model USING GIN (lower(name) gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_model_file_trgm
    ON model USING GIN (lower(file_name) gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_schema_name_trgm
    ON schema_artifact USING GIN (lower(name) gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_run_name_trgm
    ON prediction_run USING GIN (lower(name) gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_plugin_file_trgm
    ON plugin_metadata USING GIN (lower(file_name) gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_plugin_kind_trgm
    ON plugin_metadata USING GIN (lower(kind) gin_trgm_ops);
