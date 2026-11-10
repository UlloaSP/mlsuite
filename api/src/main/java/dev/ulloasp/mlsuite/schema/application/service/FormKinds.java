package dev.ulloasp.mlsuite.schema.application.service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** The kinds a form schema names, at any depth: custom kinds are drawn by plugins, built-in kinds by MLForm. */
public final class FormKinds {

    private FormKinds() {
    }

    public static Set<String> of(Object formSchema) {
        Set<String> kinds = new HashSet<>();
        collect(formSchema, kinds);
        return kinds;
    }

    private static void collect(Object node, Set<String> kinds) {
        if (node instanceof Map<?, ?> map) {
            if (map.get("kind") instanceof String kind) {
                kinds.add(kind);
            }
            map.values().forEach(value -> collect(value, kinds));
        } else if (node instanceof List<?> list) {
            list.forEach(value -> collect(value, kinds));
        }
    }
}
