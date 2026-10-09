package dev.ulloasp.mlsuite.schema.catalog;

import java.math.BigDecimal;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/** Persisted JSON numbers and text follow {@code JSON.stringify}'s value semantics. */
final class InferenceJsonValues {

    /**
     * Indentation stops growing at this depth. Honest payloads never reach it; without it a deeply
     * nested payload, or a long chain of report steps, would multiply its own stored size.
     */
    static final int MAX_INDENT_LEVELS = 32;

    private static final String INDENT = "  ";
    private static final char[] HEX = "0123456789abcdef".toCharArray();

    private InferenceJsonValues() {
    }

    /** A number as JavaScript prints it: 7 for 7.0, and an exponent only where JavaScript uses one. */
    static String number(Number value) {
        double number = value.doubleValue();
        if (!Double.isFinite(number)) {
            return "null";
        }
        if (number == 0) {
            return "0";
        }
        BigDecimal decimal = BigDecimal.valueOf(number).stripTrailingZeros();
        boolean plain = Math.abs(number) >= 1e-6 && Math.abs(number) < 1e21;
        return plain ? decimal.toPlainString() : decimal.toString().replace('E', 'e');
    }

    static String json(Object value, boolean pretty) {
        StringBuilder json = new StringBuilder();
        write(json, value, pretty, 0);
        return json.toString();
    }

    static String indent(int levels) {
        return INDENT.repeat(Math.min(levels, MAX_INDENT_LEVELS));
    }

    private static void write(StringBuilder json, Object value, boolean pretty, int depth) {
        if (value == null) {
            json.append("null");
        } else if (value instanceof Number number) {
            json.append(number(number));
        } else if (value instanceof Boolean flag) {
            json.append(flag.booleanValue());
        } else if (value instanceof Map<?, ?> entries) {
            writeObject(json, entries, pretty, depth);
        } else if (value instanceof List<?> items) {
            writeArray(json, items, pretty, depth);
        } else {
            quote(json, value.toString());
        }
    }

    private static void writeObject(StringBuilder json, Map<?, ?> entries, boolean pretty, int depth) {
        if (entries.isEmpty()) {
            json.append("{}");
            return;
        }
        json.append('{');
        Iterator<? extends Map.Entry<?, ?>> iterator = entries.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<?, ?> entry = iterator.next();
            startItem(json, pretty, depth + 1);
            quote(json, String.valueOf(entry.getKey()));
            json.append(pretty ? ": " : ":");
            write(json, entry.getValue(), pretty, depth + 1);
            json.append(iterator.hasNext() ? "," : "");
        }
        startItem(json, pretty, depth);
        json.append('}');
    }

    private static void writeArray(StringBuilder json, List<?> items, boolean pretty, int depth) {
        if (items.isEmpty()) {
            json.append("[]");
            return;
        }
        json.append('[');
        for (int index = 0; index < items.size(); index++) {
            startItem(json, pretty, depth + 1);
            write(json, items.get(index), pretty, depth + 1);
            json.append(index + 1 < items.size() ? "," : "");
        }
        startItem(json, pretty, depth);
        json.append(']');
    }

    private static void startItem(StringBuilder json, boolean pretty, int depth) {
        if (pretty) {
            json.append('\n').append(indent(depth));
        }
    }

    private static void quote(StringBuilder json, String text) {
        json.append('"');
        for (int index = 0; index < text.length(); index++) {
            char character = text.charAt(index);
            switch (character) {
                case '"' -> json.append("\\\"");
                case '\\' -> json.append("\\\\");
                case '\b' -> json.append("\\b");
                case '\f' -> json.append("\\f");
                case '\n' -> json.append("\\n");
                case '\r' -> json.append("\\r");
                case '\t' -> json.append("\\t");
                default -> {
                    if (character < ' ' || unpaired(text, index)) {
                        escape(json, character);
                    } else {
                        json.append(character);
                    }
                }
            }
        }
        json.append('"');
    }

    private static boolean unpaired(String text, int index) {
        char character = text.charAt(index);
        if (Character.isHighSurrogate(character)) {
            return index + 1 == text.length() || !Character.isLowSurrogate(text.charAt(index + 1));
        }
        return Character.isLowSurrogate(character)
                && (index == 0 || !Character.isHighSurrogate(text.charAt(index - 1)));
    }

    private static void escape(StringBuilder json, char character) {
        json.append("\\u")
                .append(HEX[character >> 12 & 0xF])
                .append(HEX[character >> 8 & 0xF])
                .append(HEX[character >> 4 & 0xF])
                .append(HEX[character & 0xF]);
    }
}
