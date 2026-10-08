package dev.ulloasp.mlsuite.schema.application.dto;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import jakarta.annotation.Nullable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** What a member edits of a bookmark. All are replaced: a blank description or note removes it. */
public record UpdateSchemaBookmarkRequest(
        @NotBlank @Size(max = SchemaBookmark.NAME_MAX_LENGTH,
                message = "must be at most {max} characters") String name,
        @Nullable @Size(max = SchemaBookmark.DESCRIPTION_MAX_LENGTH,
                message = "must be at most {max} characters") String description,
        @Nullable @Size(max = SchemaBookmark.PUBLICATION_NOTE_MAX_LENGTH,
                message = "must be at most {max} characters") String publicationNote) {
}
