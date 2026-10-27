package dev.ulloasp.mlsuite.schema.application.service;

import java.util.Map;

/**
 * Where a stored {@code mappedTo} sends a value for one bound model: MLForm's resolution. A bare
 * target serves every model; a map is read by model name, then {@code default}, then model id.
 * {@code shared} tells a target that serves every model without an entry of its own (a bare
 * target or the default) from one named for this model.
 */
record ModelRoute(Object target, boolean shared) {

    private static final String DEFAULT_ROUTE = "default";

    static ModelRoute of(Object mappedTo, Long modelId, String modelName) {
        if (isTarget(mappedTo)) return new ModelRoute(mappedTo, true);
        if (!(mappedTo instanceof Map<?, ?> routes)) return null;
        if (isTarget(routes.get(modelName))) return new ModelRoute(routes.get(modelName), false);
        if (isTarget(routes.get(DEFAULT_ROUTE))) return new ModelRoute(routes.get(DEFAULT_ROUTE), true);
        Object byId = routes.get(String.valueOf(modelId));
        return isTarget(byId) ? new ModelRoute(byId, false) : null;
    }

    /** A feature or output as a run names it: an integral number by its digits. */
    static String name(Object target) {
        return target instanceof Number number && number.doubleValue() == Math.rint(number.doubleValue())
                ? String.valueOf(number.longValue())
                : String.valueOf(target);
    }

    String targetName() {
        return name(target);
    }

    private static boolean isTarget(Object value) {
        return value instanceof String || value instanceof Number;
    }
}
