-- An organization may carry a logo, shown beside its name wherever the organization is named,
-- public pages included. The image is stored normalized (square, at most 256px) next to the
-- organization and leaves with it; logo_updated_at versions the public URL so browsers cache it.
-- avatar_url only ever held a copy of the creator's avatar and was never shown: it goes.
CREATE TABLE organization_logo (
    organization_id BIGINT PRIMARY KEY
        CONSTRAINT fk_organization_logo_organization REFERENCES organization (id) ON DELETE CASCADE,
    content BYTEA NOT NULL,
    content_type VARCHAR(40) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE organization ADD COLUMN logo_updated_at TIMESTAMPTZ;
ALTER TABLE organization DROP COLUMN avatar_url;

-- A published bookmark may carry a note for its visitors: the paper it was published in, a DOI,
-- terms of use. Free text, shown on the public page below the description.
ALTER TABLE schema_bookmark ADD COLUMN publication_note VARCHAR(1000);
