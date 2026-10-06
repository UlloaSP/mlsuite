package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.Collection;
import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.schema.application.dto.BookmarkExampleCounts;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaBookmarkExampleDto;

/** Runs a member curated as public examples of a bookmark. */
public interface SchemaBookmarkExampleUseCase {

    /** Every marked run of the bookmark, served or not, in the order they were marked. */
    List<SchemaBookmarkExampleDto> listExamples(Long userId, Long bookmarkId);

    /**
     * Marks one run as an example of the bookmark. Only a run of the snapshot the bookmark pins
     * now qualifies. Marking an example again changes nothing.
     */
    SchemaBookmarkExampleDto markExample(Long userId, Long bookmarkId, Long runId);

    /** Stops offering the run as an example; a run that was not one is left as it is. */
    void unmarkExample(Long userId, Long bookmarkId, Long runId);

    /**
     * Example counts for bookmarks the caller was already authorized to read, keyed by bookmark
     * id. A bookmark without marked runs has no entry.
     */
    Map<Long, BookmarkExampleCounts> countExamples(Collection<Long> bookmarkIds);
}
