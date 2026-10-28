package dev.ulloasp.mlsuite.schema.application.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaMappingIssueDto;

/**
 * A snapshot's mappings read against the signatures of the models it binds. A field sends its
 * value to an input and a report reads an output; one that names neither runs without error and
 * silently drops the value or the report, so each such mapping is an issue, located by the JSON
 * pointer of the {@code mappedTo} (or of its entry) that names it.
 */
final class SchemaMappings {

    private static final String MAPPED_TO = "mappedTo";
    private static final int LISTED = 8;

    /**
     * What a model takes and answers, as its persisted schema (the runtime's analysis of its
     * bundle) names them: the features its fields map to and the outputs its reports read.
     */
    record Signature(Long id, String name, Set<String> inputs, Set<String> outputs) {

        static Signature of(Model model) {
            Map<String, Object> schema = model.getInputSchema() == null ? Map.of() : model.getInputSchema();
            Set<String> inputs = new LinkedHashSet<>();
            collectTargets(schema.get("fields"), inputs);
            Set<String> outputs = new LinkedHashSet<>();
            for (Object report : list(schema.get("reports"))) {
                if (report instanceof Map<?, ?> config && isTarget(config.get(MAPPED_TO))) {
                    outputs.add(ModelRoute.name(config.get(MAPPED_TO)));
                }
            }
            return new Signature(model.getId(), model.getName(), inputs, outputs);
        }
    }

    private enum Side {
        INPUT("Field", "sends to input", "inputs", Signature::inputs),
        OUTPUT("Report", "reads output", "outputs", Signature::outputs);

        private final String subject;
        private final String verb;
        private final String plural;
        private final Function<Signature, Set<String>> targets;

        Side(String subject, String verb, String plural, Function<Signature, Set<String>> targets) {
            this.subject = subject;
            this.verb = verb;
            this.plural = plural;
            this.targets = targets;
        }
    }

    private SchemaMappings() {
    }

    static List<SchemaMappingIssueDto> issues(Map<String, Object> formSchema, List<Signature> models) {
        List<SchemaMappingIssueDto> issues = new ArrayList<>();
        Map<String, Object> source = formSchema == null ? Map.of() : formSchema;
        List<?> fields = list(source.get("fields"));
        for (int index = 0; index < fields.size(); index++) {
            if (fields.get(index) instanceof Map<?, ?> field) {
                walkInputs(field, "/fields/" + index, subject(Side.INPUT, field, index), models, issues);
            }
        }
        List<?> reports = list(source.get("reports"));
        for (int index = 0; index < reports.size(); index++) {
            if (reports.get(index) instanceof Map<?, ?> report && report.containsKey(MAPPED_TO)) {
                check(report.get(MAPPED_TO), "/reports/" + index + "/" + MAPPED_TO, subject(Side.OUTPUT, report, index),
                        Side.OUTPUT, models, issues);
            }
        }
        return issues;
    }

    /** A field routes at every depth: its own mapping, its options' and its aggregations'. */
    private static void walkInputs(Object value, String pointer, String subject, List<Signature> models,
            List<SchemaMappingIssueDto> issues) {
        if (value instanceof List<?> items) {
            for (int index = 0; index < items.size(); index++) {
                walkInputs(items.get(index), pointer + "/" + index, subject, models, issues);
            }
        } else if (value instanceof Map<?, ?> entries) {
            entries.forEach((key, entry) -> {
                String at = pointer + "/" + escape(String.valueOf(key));
                if (MAPPED_TO.equals(key)) {
                    check(entry, at, subject, Side.INPUT, models, issues);
                } else {
                    walkInputs(entry, at, subject, models, issues);
                }
            });
        }
    }

    private static void check(Object mappedTo, String pointer, String subject, Side side, List<Signature> models,
            List<SchemaMappingIssueDto> issues) {
        if (!isTarget(mappedTo) && !(mappedTo instanceof Map<?, ?>)) return;
        boolean routed = false;
        List<Signature> sharing = new ArrayList<>();
        String shared = null;
        for (Signature model : models) {
            ModelRoute route = ModelRoute.of(mappedTo, model.id(), model.name());
            if (route == null) continue;
            routed = true;
            if (route.shared()) {
                sharing.add(model);
                shared = route.targetName();
            } else if (!side.targets.apply(model).contains(route.targetName())) {
                issues.add(new SchemaMappingIssueDto(pointer + "/" + escape(entryKey(mappedTo, model)),
                        missing(subject, side, route.targetName(), model)));
            }
        }
        if (!routed) {
            issues.add(new SchemaMappingIssueDto(pointer, subject + " maps to no bound model."));
            return;
        }
        String target = shared;
        if (sharing.isEmpty() || sharing.stream().anyMatch(model -> side.targets.apply(model).contains(target))) return;
        String at = mappedTo instanceof Map<?, ?> ? pointer + "/default" : pointer;
        issues.add(new SchemaMappingIssueDto(at, sharing.size() == 1
                ? missing(subject, side, target, sharing.get(0))
                : "%s %s \"%s\", which none of the bound models (%s) has.".formatted(subject, side.verb, target,
                        sharing.stream().map(Signature::name).collect(Collectors.joining(", ")))));
    }

    private static String missing(String subject, Side side, String target, Signature model) {
        Set<String> known = side.targets.apply(model);
        String listed = known.stream().limit(LISTED).collect(Collectors.joining(", "))
                + (known.size() > LISTED ? ", …" : "");
        return "%s %s \"%s\", which model \"%s\" does not have (its %s: %s).".formatted(subject, side.verb, target,
                model.name(), side.plural, known.isEmpty() ? "none" : listed);
    }

    /** The entry of a per-model mapping that names this model: by name, else by id. */
    private static String entryKey(Object mappedTo, Signature model) {
        return mappedTo instanceof Map<?, ?> routes && isTarget(routes.get(model.name()))
                ? model.name()
                : String.valueOf(model.id());
    }

    private static String subject(Side side, Map<?, ?> config, int index) {
        for (String name : List.of("label", "id")) {
            if (config.get(name) instanceof String text && !text.isBlank()) {
                return "%s \"%s\"".formatted(side.subject, text);
            }
        }
        return side.subject + " " + (index + 1);
    }

    private static void collectTargets(Object value, Set<String> targets) {
        if (value instanceof List<?> items) {
            items.forEach(item -> collectTargets(item, targets));
        } else if (value instanceof Map<?, ?> entries) {
            entries.forEach((key, entry) -> {
                if (MAPPED_TO.equals(key) && isTarget(entry)) {
                    targets.add(ModelRoute.name(entry));
                } else {
                    collectTargets(entry, targets);
                }
            });
        }
    }

    private static boolean isTarget(Object value) {
        return value instanceof String || value instanceof Number;
    }

    private static List<?> list(Object value) {
        return value instanceof List<?> items ? items : List.of();
    }

    /** RFC 6901: a key is one pointer segment. */
    private static String escape(String key) {
        return key.replace("~", "~0").replace("/", "~1");
    }
}
