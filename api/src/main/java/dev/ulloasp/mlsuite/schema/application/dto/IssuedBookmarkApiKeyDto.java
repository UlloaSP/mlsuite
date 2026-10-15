package dev.ulloasp.mlsuite.schema.application.dto;

/** A key just issued, with its secret: the only answer that ever carries it. */
public record IssuedBookmarkApiKeyDto(BookmarkApiKeyDto key, String secret) {
}
