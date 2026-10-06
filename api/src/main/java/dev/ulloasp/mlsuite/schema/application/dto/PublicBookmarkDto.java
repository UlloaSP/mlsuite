package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.Map;

import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

import jakarta.annotation.Nullable;

/**
 * A published bookmark as anyone may read it: display metadata and the form of its pinned
 * snapshot. It names nothing by internal id, and {@code formSchema} is the public form, whose
 * inputs and reports carry opaque keys where the stored form names models and features.
 */
public record PublicBookmarkDto(
        String publicId,
        String name,
        String schemaName,
        @Nullable String schemaDescription,
        int version,
        @Nullable String versionName,
        String organizationName,
        Map<String, Object> formSchema,
        OffsetDateTime updatedAt) {

    public static PublicBookmarkDto from(SchemaBookmark bookmark, Map<String, Object> publicFormSchema) {
        Schema schema = bookmark.getSchema();
        SchemaVersion version = bookmark.getVersion();
        return new PublicBookmarkDto(
                bookmark.getPublicId(),
                bookmark.getName(),
                schema.getName(),
                schema.getDescription(),
                version.getVersion(),
                version.getName(),
                schema.getOrganization().getName(),
                publicFormSchema,
                bookmark.getUpdatedAt());
    }
}
