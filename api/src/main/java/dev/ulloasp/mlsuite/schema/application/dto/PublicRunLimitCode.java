package dev.ulloasp.mlsuite.schema.application.dto;

/** Which limit refused a public run: signing in raises the first, nothing raises the second. */
public enum PublicRunLimitCode {
    ANONYMOUS_RUN_LIMIT_REACHED,
    SIGNED_IN_RUN_LIMIT_REACHED
}
