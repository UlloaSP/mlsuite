package dev.ulloasp.mlsuite.signature.services;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.plugin.dtos.PluginDto;
import dev.ulloasp.mlsuite.plugin.services.PluginService;
import dev.ulloasp.mlsuite.signature.exceptions.InvalidSignatureSchemaException;

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

    private final PluginService pluginService;

    public SignatureSchemaCompatibilityServiceImpl(PluginService pluginService) {
        this.pluginService = pluginService;
    }

    @Override
    public void validate(Long userId, Map<String, Object> inputSignature) {
        PluginCatalog catalog = loadCatalog(userId);
        validateKinds(inputSignature.get("fields"), "field", BUILTIN_FIELD_KINDS, catalog.allFieldKinds(),
                catalog.activeFieldKinds());
        validateKinds(inputSignature.get("reports"), "report", BUILTIN_REPORT_KINDS, catalog.allReportKinds(),
                catalog.activeReportKinds());
        validateKinds(inputSignature.get("explanations"), "explanation", Set.of(), catalog.allExplanationKinds(),
                catalog.activeExplanationKinds());
    }

    private PluginCatalog loadCatalog(Long userId) {
        Set<String> allFieldKinds = new LinkedHashSet<>();
        Set<String> activeFieldKinds = new LinkedHashSet<>();
        Set<String> allReportKinds = new LinkedHashSet<>();
        Set<String> activeReportKinds = new LinkedHashSet<>();
        Set<String> allExplanationKinds = new LinkedHashSet<>();
        Set<String> activeExplanationKinds = new LinkedHashSet<>();
        for (PluginDto plugin : pluginService.list(userId)) {
            Optional<PluginDescriptor> descriptor = detect(plugin.source());
            if (descriptor.isEmpty()) {
                continue;
            }
            switch (descriptor.get().type()) {
                case FIELD -> {
                    allFieldKinds.add(descriptor.get().kind());
                    if (plugin.active()) {
                        activeFieldKinds.add(descriptor.get().kind());
                    }
                }
                case REPORT -> {
                    allReportKinds.add(descriptor.get().kind());
                    if (plugin.active()) {
                        activeReportKinds.add(descriptor.get().kind());
                    }
                }
                case EXPLANATION -> {
                    allExplanationKinds.add(descriptor.get().kind());
                    if (plugin.active()) {
                        activeExplanationKinds.add(descriptor.get().kind());
                    }
                }
            }
        }
        return new PluginCatalog(
                Set.copyOf(allFieldKinds),
                Set.copyOf(activeFieldKinds),
                Set.copyOf(allReportKinds),
                Set.copyOf(activeReportKinds),
                Set.copyOf(allExplanationKinds),
                Set.copyOf(activeExplanationKinds));
    }

    private void validateKinds(
            Object rawItems,
            String pluginType,
            Set<String> builtinKinds,
            Set<String> allKinds,
            Set<String> activeKinds) {
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
            if (!allKinds.contains(kind)) {
                throw new InvalidSignatureSchemaException(
                        "Custom " + pluginType + " kind \"" + kind + "\" does not exist in active plugin catalog.");
            }
            if (!activeKinds.contains(kind)) {
                throw new InvalidSignatureSchemaException(
                        "Custom " + pluginType + " kind \"" + kind + "\" exists but is inactive.");
            }
        }
    }

    private Optional<PluginDescriptor> detect(String source) {
        PluginType type = null;
        if (source.contains("defineFieldDefinition(")) {
            type = PluginType.FIELD;
        }
        if (source.contains("defineReportDefinition(")) {
            type = type == null ? PluginType.REPORT : null;
        }
        if (source.contains("defineExplanationKind(")) {
            type = type == null ? PluginType.EXPLANATION : null;
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

    private record PluginCatalog(
            Set<String> allFieldKinds,
            Set<String> activeFieldKinds,
            Set<String> allReportKinds,
            Set<String> activeReportKinds,
            Set<String> allExplanationKinds,
            Set<String> activeExplanationKinds) {
    }

    private record PluginDescriptor(PluginType type, String kind) {
    }

    private enum PluginType {
        FIELD,
        REPORT,
        EXPLANATION
    }
}
