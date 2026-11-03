package dev.ulloasp.mlsuite.schema.application.port.in;

/** Removes the pieces of a schema. What others rely on is refused, saying what relies on it. */
public interface SchemaContentDeletionUseCase {

    void deleteDraft(Long userId, Long draftId);

    /**
     * Unpublishes the bookmark and removes it with its examples and API grants; the runs made
     * from it stay. Refused while one of its bulk uploads is open.
     */
    void deleteBookmark(Long userId, Long bookmarkId);

    /** Refused while a run, a review, a bookmark, an open draft or an open bulk upload needs the snapshot. */
    void deleteVersion(Long userId, Long versionId);
}
