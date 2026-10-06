package dev.ulloasp.mlsuite.schema.application.dto;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmarkExample;

/**
 * A bookmark's marked runs, split by the snapshot rule: {@code current} ran on the snapshot it
 * pins (served while it is public), {@code stale} ran on one it has moved away from (never served).
 */
public record BookmarkExampleCounts(long current, long stale) {

    public static final BookmarkExampleCounts NONE = new BookmarkExampleCounts(0, 0);

    public static BookmarkExampleCounts of(SchemaBookmarkExample example) {
        return example.isOnPinnedSnapshot() ? new BookmarkExampleCounts(1, 0) : new BookmarkExampleCounts(0, 1);
    }

    public BookmarkExampleCounts plus(BookmarkExampleCounts other) {
        return new BookmarkExampleCounts(current + other.current, stale + other.stale);
    }
}
