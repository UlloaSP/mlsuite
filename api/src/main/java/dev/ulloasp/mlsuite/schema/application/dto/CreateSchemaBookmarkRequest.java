package dev.ulloasp.mlsuite.schema.application.dto;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import jakarta.annotation.Nullable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Saving under a name the schema already has moves that bookmark to {@code versionId}; it then
 * keeps its description unless this request gives one.
 */
public record CreateSchemaBookmarkRequest(
        @NotBlank @Size(max = SchemaBookmark.NAME_MAX_LENGTH,
                message = "must be at most {max} characters") String name,
        @NotNull Long versionId,
        @Nullable @Size(max = SchemaBookmark.DESCRIPTION_MAX_LENGTH,
                message = "must be at most {max} characters") String description) {
}
