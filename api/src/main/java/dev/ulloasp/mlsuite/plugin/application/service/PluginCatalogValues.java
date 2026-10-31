package dev.ulloasp.mlsuite.plugin.application.service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.plugin.domain.model.StoredPlugin;
import dev.ulloasp.mlsuite.user.domain.model.DeletedUser;

final class PluginCatalogValues {
    private PluginCatalogValues() {}
    private static final Pattern FIELD_KIND = Pattern.compile(
            "defineField(?:Kind|Definition)\\s*\\([^)]*kind\\s*:\\s*['\"]([^'\"]+)['\"]",
            Pattern.DOTALL);
    private static final Pattern REPORT_KIND = Pattern.compile(
            "defineReport(?:Kind|Definition)\\s*(?:<[^>]+>\\s*)?\\([^)]*kind\\s*:\\s*['\"]([^'\"]+)['\"]",
            Pattern.DOTALL);

    /** The stored object keeps who wrote it as it was; the row says whether they are still there. */
    static PluginDto toDto(StoredPlugin stored, PluginMetadata row) {
        return row.getUpdatedBy() != null ? toDto(stored) : new PluginDto(stored.id(), stored.fileName(),
                stored.contentType(), stored.sizeBytes(), stored.createdAt(), stored.updatedAt(), DeletedUser.NAME,
                null, stored.source(), describe(stored.source()).type(), describe(stored.source()).kind());
    }

    static PluginDto toDto(StoredPlugin stored) {
        PluginDescriptor descriptor = describe(stored.source());
        return new PluginDto(
                stored.id(),
                stored.fileName(),
                stored.contentType(),
                stored.sizeBytes(),
                stored.createdAt(),
                stored.updatedAt(),
                stored.updatedByName(),
                stored.updatedByEmail(),
                stored.source(),
                descriptor.type(),
                descriptor.kind());
    }

    static PluginDescriptor describe(String source) {
        PluginDescriptor field = matchDescriptor(source, "field", FIELD_KIND);
        if (field != null) {
            return field;
        }
        PluginDescriptor report = matchDescriptor(source, "report", REPORT_KIND);
        if (report != null) {
            return report;
        }
        return new PluginDescriptor("invalid", null);
    }

    static PluginDescriptor matchDescriptor(String source, String type, Pattern pattern) {
        Matcher matcher = pattern.matcher(source);
        return matcher.find() ? new PluginDescriptor(type, matcher.group(1)) : null;
    }

    record PluginDescriptor(String type, String kind) {}
}
