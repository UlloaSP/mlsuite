package dev.ulloasp.mlsuite.plugin.application.service;

import java.util.Comparator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.plugin.domain.model.StoredPlugin;

final class PluginCatalogValues {
    private PluginCatalogValues() {}
    private static final Pattern FIELD_KIND = Pattern.compile(
            "defineField(?:Kind|Definition)\\s*\\([^)]*kind\\s*:\\s*['\"]([^'\"]+)['\"]",
            Pattern.DOTALL);
    private static final Pattern REPORT_KIND = Pattern.compile(
            "defineReport(?:Kind|Definition)\\s*(?:<[^>]+>\\s*)?\\([^)]*kind\\s*:\\s*['\"]([^'\"]+)['\"]",
            Pattern.DOTALL);

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
                stored.updatedByAvatarUrl(),
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

    static boolean matchesType(PluginDto item, String type) {
        if ("field".equals(type) || "report".equals(type)) {
            return type.equals(item.pluginType());
        }
        return true;
    }

    static boolean matchesSearch(PluginDto item, String search) {
        String needle = search == null ? "" : search.strip().toLowerCase();
        if (needle.isEmpty()) {
            return true;
        }
        return item.fileName().toLowerCase().contains(needle)
                || (item.kind() != null && item.kind().toLowerCase().contains(needle));
    }

    static Comparator<PluginDto> sortComparator(String sort) {
        if ("name".equals(sort)) {
            return Comparator
                    .comparing((PluginDto item) -> displayName(item), String.CASE_INSENSITIVE_ORDER)
                    .thenComparing(PluginDto::updatedAt, Comparator.reverseOrder());
        }
        return Comparator
                .comparing(PluginDto::updatedAt, Comparator.reverseOrder())
                .thenComparing(PluginDto::fileName, String.CASE_INSENSITIVE_ORDER);
    }

    static String displayName(PluginDto item) {
        return item.kind() == null ? item.fileName() : item.kind();
    }

    record PluginDescriptor(String type, String kind) {}
}
