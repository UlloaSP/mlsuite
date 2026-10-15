package dev.ulloasp.mlsuite.schema.domain.model;

/**
 * Where a run was made: the workspace's form, a bookmark's public page, or a consumer's own
 * software calling with one of the bookmark's API keys. An API run has no visitor; it carries
 * the key's name as its author.
 */
public enum PredictionRunOrigin {
    WORKSPACE,
    PUBLIC,
    API
}
