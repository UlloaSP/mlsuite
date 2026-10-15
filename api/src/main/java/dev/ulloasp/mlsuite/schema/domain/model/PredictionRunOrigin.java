package dev.ulloasp.mlsuite.schema.domain.model;

/**
 * Where a run was made: the workspace's form, a bookmark's public page, or an API client's own
 * software calling with one of its keys. An API run has no visitor; it carries the client's
 * name as its author, and its call in api_request names the client and key.
 */
public enum PredictionRunOrigin {
    WORKSPACE,
    PUBLIC,
    API
}
