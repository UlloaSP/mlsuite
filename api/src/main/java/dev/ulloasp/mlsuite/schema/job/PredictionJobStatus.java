package dev.ulloasp.mlsuite.schema.job;

/** A bulk job waits (QUEUED), runs under a worker's lease (RUNNING), and ends COMPLETED or CANCELLED. */
public enum PredictionJobStatus {
    QUEUED,
    RUNNING,
    COMPLETED,
    CANCELLED
}
