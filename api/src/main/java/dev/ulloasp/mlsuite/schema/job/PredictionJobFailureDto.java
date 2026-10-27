package dev.ulloasp.mlsuite.schema.job;

/** A row the job could not store as a run, and why. */
public record PredictionJobFailureDto(int rowIndex, String name, String error) {
}
