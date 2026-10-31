package dev.ulloasp.mlsuite.audit.domain.model;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/**
 * What an entry keeps about what changed: names, old and new values, counts and ids. It never holds
 * secrets, passwords, API keys, or prediction inputs and outputs. Values left null are dropped, and
 * long text is cut, so one entry stays small however large the thing it describes.
 */
public final class AuditDetails {

    static final int MAX_TEXT = 500;

    private AuditDetails() {
    }

    /** Alternating keys and values, in the order they read. */
    public static Map<String, Object> of(Object... keysAndValues) {
        if (keysAndValues.length % 2 != 0) {
            throw new IllegalArgumentException("Audit details come in key and value pairs.");
        }
        Map<String, Object> details = new LinkedHashMap<>();
        for (int index = 0; index < keysAndValues.length; index += 2) {
            Object value = keysAndValues[index + 1];
            if (value != null) details.put(String.valueOf(keysAndValues[index]), bounded(value));
        }
        return details;
    }

    /** An old and a new value, or null when they are the same, which leaves the key out. */
    public static Map<String, Object> changed(Object from, Object to) {
        return Objects.equals(from, to) ? null : of("from", from, "to", to);
    }

    private static Object bounded(Object value) {
        if (value instanceof Number || value instanceof Boolean || value instanceof Map) return value;
        String text = value.toString();
        return text.length() <= MAX_TEXT ? text : text.substring(0, MAX_TEXT - 1) + "…";
    }
}
