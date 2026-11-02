-- Every plugin has been stored with its metadata row, in one transaction, since the baseline: there
-- are no object-only plugins left to index, and every row pins its object's version and SHA-256.
ALTER TABLE organization DROP COLUMN plugin_catalog_indexed;
ALTER TABLE plugin_metadata
    ALTER COLUMN sha256 SET NOT NULL,
    ALTER COLUMN storage_version_id SET NOT NULL;
