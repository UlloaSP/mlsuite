-- What a model's bundle says about it: the bundle's manifest as uploaded, and the feature
-- importances the runtime reads from its structure (absent for models without one).
ALTER TABLE model
    ADD COLUMN bundle_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN feature_importances jsonb;
