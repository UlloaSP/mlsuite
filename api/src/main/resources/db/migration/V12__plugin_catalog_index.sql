ALTER TABLE organization ADD COLUMN plugin_catalog_indexed BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_plugin_catalog ON plugin_metadata (organization_id, updated_at DESC, id);
