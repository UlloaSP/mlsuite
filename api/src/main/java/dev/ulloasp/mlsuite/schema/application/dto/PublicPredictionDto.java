package dev.ulloasp.mlsuite.schema.application.dto;

/**
 * The outcome of a public run: the run as it was kept, for the caller to read back, and what
 * the caller may still run on this bookmark now that this run is counted.
 */
public record PublicPredictionDto(PublicRunDto run, PublicRunQuotaDto quota) {
}
