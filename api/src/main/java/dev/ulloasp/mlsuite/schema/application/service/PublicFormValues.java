package dev.ulloasp.mlsuite.schema.application.service;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.application.service.PublicForm.InputField;

/**
 * The values a public run may carry: only the form's own inputs, each in the shape its field
 * sends, so the form bounds what a run carries. A key takes one scalar, except a series field's
 * rows key, which takes the rows its columns define. A refusal names the field by its label, as
 * the visitor saw it, never by its input key.
 */
public final class PublicFormValues {

    /** Model features are numbers, flags, or short categories; nothing longer is a form value. */
    public static final int MAX_TEXT_LENGTH = 256;
    /** The most rows a series takes when it sets no {@code maxPoints} of its own. */
    static final int MAX_ROWS = 1000;

    private PublicFormValues() {
    }

    public static void require(PublicForm form, Map<String, Object> values) {
        values.forEach((key, value) -> {
            InputField field = form.field(key).orElseThrow(() -> badRequest(
                    "This page sent a value its form has no input for. Reload the page and run it again."));
            if (field.rows() ? !isRows(value, field.config()) : !isScalar(value)) {
                throw badRequest("\"%s\" has a value the form cannot send.".formatted(field.label()));
            }
        });
    }

    /** A scalar a model feature can take: null, a flag, a short text, or a finite number. */
    public static boolean isScalar(Object value) {
        if (value == null || value instanceof Boolean) return true;
        if (value instanceof String text) return text.length() <= MAX_TEXT_LENGTH;
        if (value instanceof BigInteger || value instanceof BigDecimal) return false;
        return value instanceof Number number && Double.isFinite(number.doubleValue());
    }

    /** No more rows than the series allows, each an object of its columns' cells, as MLForm serializes them. */
    private static boolean isRows(Object value, Map<?, ?> series) {
        if (value == null) return true;
        if (!(value instanceof List<?> rows) || rows.size() > maxRows(series)) return false;
        Map<Object, Object> kinds = columnKinds(series);
        return rows.stream().allMatch(row -> row instanceof Map<?, ?> cells && cells.entrySet().stream()
                .allMatch(cell -> kinds.containsKey(cell.getKey()) && isCell(cell.getValue(), kinds.get(cell.getKey()))));
    }

    private static int maxRows(Map<?, ?> series) {
        return series.get("maxPoints") instanceof Number max ? Math.min(max.intValue(), MAX_ROWS) : MAX_ROWS;
    }

    private static Map<Object, Object> columnKinds(Map<?, ?> series) {
        Map<Object, Object> kinds = new LinkedHashMap<>();
        if (series.get("columns") instanceof List<?> columns) {
            for (Object column : columns) {
                if (column instanceof Map<?, ?> config && config.get("id") instanceof String id) {
                    kinds.put(id, config.get("kind"));
                }
            }
        }
        return kinds;
    }

    private static boolean isCell(Object value, Object kind) {
        if (value == null) return true;
        if (!isScalar(value)) return false;
        if ("number".equals(kind)) return value instanceof Number;
        if ("boolean".equals(kind)) return value instanceof Boolean;
        if ("date".equals(kind)) return value instanceof String text && isIsoDate(text);
        return true;
    }

    /** A date as MLForm sends it: an ISO instant, or a date alone when its column keeps only the day. */
    private static boolean isIsoDate(String text) {
        for (DateTimeFormatter format : List.of(DateTimeFormatter.ISO_DATE_TIME, DateTimeFormatter.ISO_DATE)) {
            try {
                format.parse(text);
                return true;
            } catch (DateTimeParseException notThisFormat) {
                // Try the next format.
            }
        }
        return false;
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
