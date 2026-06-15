package dev.ulloasp.mlsuite.signature.application.service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.PluginCatalogUseCase;
import dev.ulloasp.mlsuite.signature.domain.exception.InvalidSignatureSchemaException;

@Service
public class SignatureSchemaCompatibilityServiceImpl implements SignatureSchemaCompatibilityService {

    private static final Set<String> BUILTIN_FIELD_KINDS = Set.of(
            "text",
            "number",
            "boolean",
            "category",
            "date",
            "series",
            "long-text",
            "single-choice",
            "multi-choice",
            "rating",
            "mapped-category",
            "time-series");
    private static final Set<String> BUILTIN_REPORT_KINDS = Set.of("classifier", "regressor");
    private static final Pattern KIND_PATTERN = Pattern.compile("\\bkind\\s*:\\s*[\"']([^\"']+)[\"']");

    private final PluginCatalogUseCase pluginCatalogUseCase;

    public SignatureSchemaCompatibilityServiceImpl(PluginCatalogUseCase pluginCatalogUseCase) {
        this.pluginCatalogUseCase = pluginCatalogUseCase;
    }

    @Override
    public void validate(Long userId, Map<String, Object> inputSignature) {
        PluginCatalog catalog = loadCatalog(userId);
        validateKinds(inputSignature.get("fields"), "field", BUILTIN_FIELD_KINDS, catalog.fieldKinds());
        validateReportKinds(inputSignature.get("reports"), catalog);
    }

    private PluginCatalog loadCatalog(Long userId) {
        Set<String> fieldKinds = new LinkedHashSet<>();
        Set<String> reportKinds = new LinkedHashSet<>();
        for (PluginDto plugin : pluginCatalogUseCase.listAll(userId)) {
            Optional<PluginDescriptor> descriptor = detect(plugin.source());
            if (descriptor.isEmpty()) {
                continue;
            }
            switch (descriptor.get().type()) {
                case FIELD -> fieldKinds.add(descriptor.get().kind());
                case REPORT -> reportKinds.add(descriptor.get().kind());
            }
        }
        return new PluginCatalog(Set.copyOf(fieldKinds), Set.copyOf(reportKinds));
    }

    private void validateKinds(
            Object rawItems,
            String pluginType,
            Set<String> builtinKinds,
            Set<String> kinds) {
        if (!(rawItems instanceof List<?> items)) {
            return;
        }
        for (Object rawItem : items) {
            if (!(rawItem instanceof Map<?, ?> item)) {
                continue;
            }
            Object rawKind = item.get("kind");
            if (!(rawKind instanceof String kind) || kind.isBlank() || builtinKinds.contains(kind)) {
                continue;
            }
            if (!kinds.contains(kind)) {
                throw new InvalidSignatureSchemaException(
                        "Custom " + pluginType + " kind \"" + kind + "\" does not exist in plugin catalog.");
            }
        }
    }

    private void validateReportKinds(Object rawItems, PluginCatalog catalog) {
        if (!(rawItems instanceof List<?> items)) {
            return;
        }
        Set<String> allKinds = new LinkedHashSet<>(BUILTIN_REPORT_KINDS);
        allKinds.addAll(catalog.reportKinds());

        for (Object rawItem : items) {
            if (!(rawItem instanceof Map<?, ?> item)) {
                continue;
            }
            Object rawKind = item.get("kind");
            if (!(rawKind instanceof String kind) || kind.isBlank() || BUILTIN_REPORT_KINDS.contains(kind)) {
                continue;
            }
            if (!allKinds.contains(kind)) {
                throw new InvalidSignatureSchemaException(
                        "Custom report kind \"" + kind + "\" does not exist in plugin catalog.");
            }
        }
    }

    private Optional<PluginDescriptor> detect(String source) {
        PluginType type = null;
        if (source.contains("defineFieldDefinition(")) {
            type = PluginType.FIELD;
        }
        if (source.contains("defineReportDefinition(") || source.contains("defineReportKind(")) {
            type = type == null ? PluginType.REPORT : null;
        }
        if (type == null) {
            return Optional.empty();
        }
        Matcher matcher = KIND_PATTERN.matcher(source);
        if (!matcher.find()) {
            return Optional.empty();
        }
        return Optional.of(new PluginDescriptor(type, matcher.group(1)));
    }

    private record PluginCatalog(Set<String> fieldKinds, Set<String> reportKinds) {
    }

    private record PluginDescriptor(PluginType type, String kind) {
    }

    private enum PluginType {
        FIELD,
        REPORT
    }
}

