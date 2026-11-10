package dev.ulloasp.mlsuite.schema.application.service;

import java.util.Map;

/**
 * What a workspace prediction's seal vouches for: the execution itself, and the form values it was
 * computed from, by whom and through which bookmark. A run is saved only by that member, through
 * that bookmark, and keeps those form values, so its inputs are the ones that produced its results.
 */
public record SealedPrediction(AttestedPrediction prediction, Long schemaBookmarkId, Long userId,
        Map<String, Object> inputData) {

    /** An opened seal and the SHA-256 of its text, under which its result can be stored once. */
    public record Opened(SealedPrediction sealed, String sha256) {
    }
}
