package dev.ulloasp.mlsuite.schema.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import dev.ulloasp.mlsuite.schema.domain.model.BoundModel;

/** How a public form keeps a series field's rows: the visitor's values, though a model may receive only their aggregations. */
class PublicFormTest {

    private static final BoundModel MODEL = new BoundModel(1L, "houses", null);
    private static final List<Map<String, Object>> ROWS = List.of(
            Map.of("field1", 1, "field2", 100), Map.of("field1", 2, "field2", 120));
    private static final Map<String, Object> ROOMS = Map.of("kind", "number", "label", "Rooms", "mappedTo", "rooms");
    private static final List<Map<String, Object>> COLUMNS = List.of(
            Map.of("id", "field1", "kind", "number", "label", "Year"),
            Map.of("id", "field2", "kind", "number", "label", "Area"));

    @Test
    void aSeriesWhoseRowsOnlyFeedAggregationsSendsAndKeepsItsRows() {
        PublicForm form = PublicForm.of(Map.of("fields", List.of(ROOMS, series(null)), "reports", List.of()),
                List.of(MODEL));

        assertEquals(Map.of("kind", "series", "label", "Area history", "columns", COLUMNS, "mappedTo", "in2",
                "aggregations", List.of(Map.of("operation", "mean", "label", "Mean", "source", "field2",
                        "mappedTo", "in1"))),
                ((List<?>) form.schema().get("fields")).get(1));
        Map<String, Object> values = Map.of("in0", 3, "in1", 110, "in2", ROWS);
        assertEquals(Map.of("rooms", 3, "area", 110), form.modelInput(MODEL, values));
        assertEquals(Map.of("Rooms", 3, "Area history", ROWS), form.storedInputs(values));
    }

    @Test
    void aSeriesRoutedToAModelKeepsItsRowsAndNotItsAggregations() {
        PublicForm form = PublicForm.of(Map.of("fields", List.of(series("history")), "reports", List.of()),
                List.of(MODEL));

        Map<String, Object> values = Map.of("in0", ROWS, "in1", 110);
        assertEquals(Map.of("history", ROWS, "area", 110), form.modelInput(MODEL, values));
        assertEquals(Map.of("Area history", ROWS), form.storedInputs(values));
    }

    /** A series as a stored form holds it: its keys in order, so its rows' route comes before its aggregations'. */
    private static Map<String, Object> series(String mappedTo) {
        Map<String, Object> series = new LinkedHashMap<>();
        series.put("kind", "series");
        series.put("label", "Area history");
        if (mappedTo != null) series.put("mappedTo", mappedTo);
        series.put("columns", COLUMNS);
        series.put("aggregations", List.of(Map.of("operation", "mean", "label", "Mean", "source", "field2",
                "mappedTo", "area")));
        return series;
    }
}
