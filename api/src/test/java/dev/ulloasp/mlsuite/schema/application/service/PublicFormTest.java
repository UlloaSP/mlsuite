package dev.ulloasp.mlsuite.schema.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.domain.model.BoundModel;

/**
 * How a public form keeps a series field's rows (the visitor's values, though a model may receive
 * only their aggregations) and which values a public run may carry.
 */
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

    @Test
    void aSeriesKeyTakesTheRowsItsColumnsDefineAndEveryOtherKeyAScalar() {
        PublicForm form = PublicForm.of(Map.of("fields", List.of(ROOMS, dated()), "reports", List.of()),
                List.of(MODEL));
        List<Map<String, Object>> rows = List.of(
                Map.of("date", "2024-03-01T00:00:00.000Z", "area", 90),
                Map.of("date", "2024-04-01", "area", 95.5),
                Collections.singletonMap("area", null));

        PublicFormValues.require(form, Map.of("in0", 5, "in1", 100, "in2", rows));
        PublicFormValues.require(form, Map.of("in2", List.of()));
    }

    @Test
    void aValueTheFieldCannotSendIsRefusedByTheFieldsLabel() {
        PublicForm form = PublicForm.of(Map.of("fields", List.of(ROOMS, dated()), "reports", List.of()),
                List.of(MODEL));
        Map<String, Object> row = Map.of("date", "2024-03-01T00:00:00.000Z", "area", 90);
        Map<String, List<Map<String, Object>>> rejected = new HashMap<>();
        rejected.put("Rooms", List.of(Map.of("in0", List.of(1, 2)), Map.of("in0", "x".repeat(257)),
                Map.of("in0", Double.POSITIVE_INFINITY), Map.of("in0", Map.of("$gt", 0))));
        rejected.put("Area history", List.of(
                Map.of("in1", List.of(row)),
                Map.of("in2", 90),
                Map.of("in2", List.of(List.of(90))),
                Map.of("in2", List.of(Map.of("area", 90, "owner", "x"))),
                Map.of("in2", List.of(Map.of("area", "90"))),
                Map.of("in2", List.of(Map.of("date", "March 1st"))),
                Map.of("in2", List.of(Map.of("area", List.of(90)))),
                Map.of("in2", Collections.nCopies(4, row))));

        rejected.forEach((label, cases) -> {
            for (Map<String, Object> values : cases) {
                ResponseStatusException error = assertThrows(ResponseStatusException.class,
                        () -> PublicFormValues.require(form, values));
                assertEquals(400, error.getStatusCode().value(), values.toString());
                assertEquals("\"" + label + "\" has a value the form cannot send.", error.getReason(), values.toString());
            }
        });
        ResponseStatusException unknown = assertThrows(ResponseStatusException.class,
                () -> PublicFormValues.require(form, Map.of("in9", 1)));
        assertEquals("This page sent a value its form has no input for. Reload the page and run it again.",
                unknown.getReason());
    }

    /** A series of dated areas, at most three rows, whose mean area is a model feature. */
    private static Map<String, Object> dated() {
        Map<String, Object> series = new LinkedHashMap<>();
        series.put("kind", "series");
        series.put("label", "Area history");
        series.put("columns", List.of(Map.of("id", "date", "kind", "date", "label", "Date"),
                Map.of("id", "area", "kind", "number", "label", "Area")));
        series.put("maxPoints", 3);
        series.put("aggregations", List.of(Map.of("operation", "mean", "label", "Mean", "source", "area",
                "mappedTo", "area")));
        return series;
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
