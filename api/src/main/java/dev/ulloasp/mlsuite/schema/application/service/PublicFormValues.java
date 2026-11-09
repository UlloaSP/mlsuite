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
 * rows key, which takes the rows its columns define. A series also holds the rules MLForm checks
 * before the workspace runs it, since the server computes its aggregations from these rows: its
 * number of points, and that each aggregation has a result. A refusal names the field by its
 * label, as the visitor saw it, never by its input key.
 */
public final class PublicFormValues {

    /** Model features are numbers, flags, or short categories; nothing longer is a form value. */
    public static final int MAX_TEXT_LENGTH = 256;
    /** The most rows a series takes, whatever {@code maxPoints} it sets. */
    static final int MAX_ROWS = 1000;

    private PublicFormValues() {
    }

    public static void require(PublicForm form, Map<String, Object> values) {
        values.forEach((key, value) -> {
            form.aggregate(key).ifPresent(aggregate -> {
                throw badRequest("\"%s\" is calculated from its rows; send the rows, not \"%s\"."
                        .formatted(aggregate.field().label(), aggregate.label()));
            });
            InputField field = form.field(key).orElseThrow(() -> badRequest(
                    "This page sent a value its form has no input for. Reload the page and run it again."));
            if (field.rows() ? !isRows(value, field.config()) : !isScalar(value)) {
                throw badRequest("\"%s\" has a value the form cannot send.".formatted(field.label()));
            }
        });
        for (String key : form.inputKeys()) {
            form.field(key).filter(InputField::rows).ifPresent(field -> requirePoints(field, values.get(key)));
        }
    }

    /**
     * No series takes more points than it allows: its editor adds none past the limit. MLForm
     * checks the rest only while a field is active and still submits an inactive one, so a series
     * that can be disabled or hidden by a condition is held to no other rule.
     */
    private static void requirePoints(InputField field, Object value) {
        Map<?, ?> series = field.config();
        List<?> rows = value instanceof List<?> list ? list : List.of();
        if (series.get("maxPoints") instanceof Number max && rows.size() > max.intValue()) {
            throw badRequest("\"%s\" takes at most %s.".formatted(field.label(), points(max.intValue())));
        }
        if (Boolean.TRUE.equals(series.get("disabled")) || series.get("hiddenWhen") != null
                || series.get("disabledWhen") != null) {
            return;
        }
        if (Boolean.TRUE.equals(series.get("required")) && rows.isEmpty()) {
            throw badRequest("\"%s\" is required.".formatted(field.label()));
        }
        if (series.get("minPoints") instanceof Number min && rows.size() < min.intValue()) {
            throw badRequest("\"%s\" needs at least %s.".formatted(field.label(), points(min.intValue())));
        }
        if (!rows.isEmpty() && series.get("aggregations") instanceof List<?> aggregations) {
            for (Object aggregation : aggregations) {
                if (aggregation instanceof Map<?, ?> config && SeriesAggregation.calculate(rows, config) == null) {
                    throw badRequest("\"%s\" has too few or missing measurements to calculate \"%s\"."
                            .formatted(field.label(), config.get("label")));
                }
            }
        }
    }

    private static String points(int count) {
        return count == 1 ? "1 point" : count + " points";
    }

    /** A scalar a model feature can take: null, a flag, a short text, or a finite number. */
    public static boolean isScalar(Object value) {
        if (value == null || value instanceof Boolean) return true;
        if (value instanceof String text) return text.length() <= MAX_TEXT_LENGTH;
        if (value instanceof BigInteger || value instanceof BigDecimal) return false;
        return value instanceof Number number && Double.isFinite(number.doubleValue());
    }

    /** Rows a series can take, each an object of its columns' cells, as MLForm serializes them. */
    private static boolean isRows(Object value, Map<?, ?> series) {
        if (value == null) return true;
        if (!(value instanceof List<?> rows) || rows.size() > MAX_ROWS) return false;
        Map<Object, Object> kinds = columnKinds(series);
        return rows.stream().allMatch(row -> row instanceof Map<?, ?> cells && cells.entrySet().stream()
                .allMatch(cell -> kinds.containsKey(cell.getKey()) && isCell(cell.getValue(), kinds.get(cell.getKey()))));
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
