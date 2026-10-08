package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.UUID;

import jakarta.annotation.Nullable;

/**
 * A public run made, and the visitor id the browser must be given when the run started a new
 * visitor: null when the caller's cookie already named one.
 */
public record PublicRunOutcome(PublicPredictionDto result, @Nullable UUID issuedVisitorId) {
}
