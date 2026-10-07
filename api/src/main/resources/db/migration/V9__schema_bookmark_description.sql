-- A bookmark describes itself: in its schema's repository and on its public page. Bookmarks that
-- existed before take their schema's description once, here, so a public card keeps its text;
-- from now on each is edited on its own and nothing reads the schema's in a bookmark's place.
ALTER TABLE schema_bookmark ADD COLUMN description VARCHAR(800);

UPDATE schema_bookmark bookmark
SET description = schema.description
FROM schema_artifact schema
WHERE schema.id = bookmark.schema_id
  AND schema.description IS NOT NULL;
