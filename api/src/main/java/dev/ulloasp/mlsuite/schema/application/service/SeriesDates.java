package dev.ulloasp.mlsuite.schema.application.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAccessor;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * A series' date cells as every run stores them: the ISO instant MLForm serializes a date to
 * ({@code toISOString}: UTC, milliseconds), whether the rows came from the form, a bulk upload,
 * a visitor, or a client calling the API with a date alone. A date alone is that day's midnight
 * UTC, as the browser reads it. A date and time without an offset names no instant and is none.
 */
public final class SeriesDates {

    private static final DateTimeFormatter INSTANT = DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss.SSS'Z'")
            .withZone(ZoneOffset.UTC);

    private SeriesDates() {
    }

    /** The instant a date cell names, as the form writes it; none when it names no instant. */
    public static Optional<String> instant(String text) {
        try {
            return Optional.of(format(OffsetDateTime.parse(text)));
        } catch (DateTimeParseException notAnInstant) {
            // A date alone, then.
        }
        try {
            return Optional.of(format(LocalDate.parse(text).atStartOfDay(ZoneOffset.UTC)));
        } catch (DateTimeParseException notADate) {
            return Optional.empty();
        }
    }

    /** A series' rows with each date column's cells as instants; anything else is kept as sent. */
    public static Object rows(Object value, Map<?, ?> series) {
        if (!(value instanceof List<?> rows) || !(series.get("columns") instanceof List<?> columns)) return value;
        List<Object> dates = columns.stream()
                .filter(column -> column instanceof Map<?, ?> config && "date".equals(config.get("kind")))
                .<Object>map(column -> ((Map<?, ?>) column).get("id"))
                .toList();
        if (dates.isEmpty()) return value;
        return rows.stream().map(row -> row instanceof Map<?, ?> cells ? withInstants(cells, dates) : row).toList();
    }

    /** A run's stored inputs with each series field's rows, under its display key, given instants. */
    public static Map<String, Object> inStoredInputs(Map<String, Object> formSchema, Map<String, Object> inputData) {
        if (!(formSchema.get("fields") instanceof List<?> fields)) return inputData;
        Map<String, Object> stored = new LinkedHashMap<>(inputData);
        for (Object item : fields) {
            if (item instanceof Map<?, ?> field && "series".equals(field.get("kind"))) {
                String key = PublicForm.displayKey(field);
                if (key != null && stored.containsKey(key)) stored.put(key, rows(stored.get(key), field));
            }
        }
        return stored;
    }

    private static Map<Object, Object> withInstants(Map<?, ?> cells, List<Object> dates) {
        Map<Object, Object> row = new LinkedHashMap<>(cells);
        for (Object date : dates) {
            if (row.get(date) instanceof String text) row.put(date, instant(text).orElse(text));
        }
        return row;
    }

    private static String format(TemporalAccessor instant) {
        return INSTANT.format(instant);
    }
}
