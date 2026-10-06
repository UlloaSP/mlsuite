package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

import jakarta.annotation.Nullable;

/**
 * A published bookmark as anyone may read it: display metadata and the inputs of its pinned
 * snapshot. It names nothing by internal id, and {@code formSchema} carries only the form's
 * {@code fields} without their {@code mappedTo} routing, which names the models behind the form.
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

    private static final String FIELDS = "fields";
    private static final String MODEL_ROUTING = "mappedTo";

    public static PublicBookmarkDto from(SchemaBookmark bookmark) {
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
                Map.of(FIELDS, publicFields(version.getFormSchema())),
                bookmark.getUpdatedAt());
    }

    private static Object publicFields(Map<String, Object> formSchema) {
        return formSchema != null && formSchema.get(FIELDS) instanceof List<?> fields
                ? withoutModelRouting(fields)
                : List.of();
    }

    /** Options of a field route to models too, so the key is dropped at every depth. */
    private static Object withoutModelRouting(Object value) {
        if (value instanceof List<?> items) {
            return items.stream().map(PublicBookmarkDto::withoutModelRouting).toList();
        }
        if (value instanceof Map<?, ?> entries) {
            Map<Object, Object> copy = new LinkedHashMap<>();
            entries.forEach((key, entry) -> {
                if (!MODEL_ROUTING.equals(key)) copy.put(key, withoutModelRouting(entry));
            });
            return copy;
        }
        return value;
    }
}
