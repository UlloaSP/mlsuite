package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.Map;

import dev.ulloasp.mlsuite.organization.application.dto.OrganizationLogoUrl;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;

import jakarta.annotation.Nullable;

/**
 * A published bookmark as anyone may read it: display metadata and the form of its pinned
 * snapshot. It names nothing by internal id, and {@code formSchema} is the public form, whose
 * inputs and reports carry opaque keys where the stored form names models and features. The
 * schema's name, its description and the snapshot's name are the organization's own and are not
 * told; {@code description} and {@code publicationNote} are the bookmark's. {@code version} only
 * lets a run say which form it was filled on.
 */
public record PublicBookmarkDto(
        String publicId,
        String name,
        @Nullable String description,
        @Nullable String publicationNote,
        int version,
        int inputCount,
        int reportCount,
        String organizationName,
        @Nullable String organizationLogoUrl,
        Map<String, Object> formSchema,
        OffsetDateTime updatedAt) {

    public static PublicBookmarkDto from(SchemaBookmark bookmark, Map<String, Object> publicFormSchema,
            int inputCount, int reportCount) {
        return new PublicBookmarkDto(
                bookmark.getPublicId(),
                bookmark.getName(),
                bookmark.getDescription(),
                bookmark.getPublicationNote(),
                bookmark.getVersion().getVersion(),
                inputCount,
                reportCount,
                bookmark.getSchema().getOrganization().getName(),
                OrganizationLogoUrl.of(bookmark.getSchema().getOrganization()),
                publicFormSchema,
                bookmark.getUpdatedAt());
    }
}
