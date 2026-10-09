package dev.ulloasp.mlsuite.schema.application.dto;

import jakarta.annotation.Nullable;

/** Whether one run is marked as an example of a bookmark: the example, or null when it is not. */
public record BookmarkExampleStateDto(@Nullable SchemaBookmarkExampleDto example) {
}
