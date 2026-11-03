package dev.ulloasp.mlsuite.admin.purge;

/** A purge waits (QUEUED), runs under a worker's lease (RUNNING), and ends COMPLETED or FAILED until retried. */
public enum PurgeStatus {
    QUEUED,
    RUNNING,
    COMPLETED,
    FAILED
}
