package dev.ulloasp.mlsuite.schema.catalog;

import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.list;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.nonBlank;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceJsValues.trim;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceJsValues.whitespace;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** The text a custom report shows: its explanation, its blocks and markup, or its payload as JSON. */
final class InferenceReportText {

    private InferenceReportText() {
    }

    static List<String> content(Map<?, ?> payload) {
        String explanation = nonBlank(payload.get("explanation"));
        if (explanation != null) {
            return List.of(tree(explanation));
        }
        boolean structured = payload.get("title") instanceof String
                || payload.get("html") instanceof String
                || payload.get("blocks") instanceof List<?>
                || payload.get("emptyText") instanceof String;
        if (!structured) {
            return List.of(tree(InferenceJsonValues.json(payload, true)));
        }
        List<String> content = new ArrayList<>();
        Object blocks = payload.get("blocks");
        for (Object block : blocks instanceof String ? List.of(blocks) : list(blocks)) {
            String text = nonBlank(block);
            if (text != null) {
                content.add(tree(text));
            }
        }
        String html = nonBlank(payload.get("html"));
        if (html != null) {
            content.add(tree(html));
        }
        return content;
    }

    /** A decision path written as "a || b || c" reads as one indented line per step. */
    private static String tree(String value) {
        String text = trim(value);
        if (!(text.contains("|__") || text.contains("||") || text.startsWith("*"))) {
            return text;
        }
        List<String> steps = new ArrayList<>();
        for (String part : steps(text)) {
            String step = withoutMarkers(part);
            if (!step.isEmpty()) {
                steps.add(step);
            }
        }
        if (steps.isEmpty()) {
            return text;
        }
        StringBuilder tree = new StringBuilder(steps.get(0));
        for (int index = 1; index < steps.size(); index++) {
            tree.append('\n').append(InferenceJsonValues.indent(index - 1)).append("└─ ").append(steps.get(index));
        }
        return tree.toString();
    }

    /**
     * Splits where two or more bars stand together, touching or spaced apart. One pass over the text:
     * the pattern this replaces, {@code (?:\s*\|\s*){2,}}, retried every space of a long run.
     */
    private static List<String> steps(String text) {
        List<String> steps = new ArrayList<>();
        int start = 0;
        int index = 0;
        while (index < text.length()) {
            if (text.charAt(index) != '|') {
                index++;
                continue;
            }
            int bars = 0;
            int afterLastBar = index;
            int cursor = index;
            while (cursor < text.length() && (text.charAt(cursor) == '|' || whitespace(text.charAt(cursor)))) {
                if (text.charAt(cursor) == '|') {
                    bars++;
                    afterLastBar = cursor + 1;
                }
                cursor++;
            }
            if (bars > 1) {
                steps.add(text.substring(start, index));
                start = afterLastBar;
            }
            index = cursor;
        }
        steps.add(text.substring(start));
        return steps;
    }

    /** A step without its list marker ("*", "2.", "-") and its branch drawing ("|__", "->", ":"). */
    private static String withoutMarkers(String part) {
        String text = trim(part);
        int index = 0;
        while (index < text.length() && listMarker(text.charAt(index))) {
            index++;
        }
        while (index < text.length() && branchMarker(text.charAt(index))) {
            index++;
        }
        return trim(text.substring(index));
    }

    private static boolean listMarker(char character) {
        return character == '*' || character == '.' || character == ')' || character == '-'
                || character >= '0' && character <= '9' || whitespace(character);
    }

    private static boolean branchMarker(char character) {
        return character == '|' || character == '_' || character == '\\' || character == '/'
                || character == '-' || character == '>' || character == ':' || whitespace(character);
    }
}
