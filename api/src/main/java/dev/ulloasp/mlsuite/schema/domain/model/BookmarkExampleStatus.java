package dev.ulloasp.mlsuite.schema.domain.model;

/** Whether a run marked as a public example of a bookmark is reaching visitors, and why not. */
public enum BookmarkExampleStatus {
    /** The bookmark is public and pins the snapshot the run executed on. */
    SERVED,
    /** The run fits the pinned snapshot; it will be served once the bookmark is published. */
    BOOKMARK_PRIVATE,
    /** The bookmark now pins another snapshot, whose form the run's inputs may not fit. */
    BOOKMARK_MOVED
}
