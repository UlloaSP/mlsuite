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
 * only the aggregations the server computes from them) and which values a public run may carry.
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
    void aSeriesWhoseRowsOnlyFeedAggregationsSendsAndKeepsItsRowsAndItsModelGetsTheirAggregation() {
        PublicForm form = PublicForm.of(Map.of("fields", List.of(ROOMS, series(null)), "reports", List.of()),
                List.of(MODEL));

        assertEquals(Map.of("kind", "series", "label", "Area history", "columns", COLUMNS, "mappedTo", "in1",
                "aggregations", List.of(Map.of("operation", "mean", "label", "Mean", "source", "field2",
                        "mappedTo", "agg0"))),
                ((List<?>) form.schema().get("fields")).get(1));
        assertEquals(List.of("in0", "in1"), List.copyOf(form.inputKeys()));
        Map<String, Object> values = Map.of("in0", 3, "in1", ROWS);
        assertEquals(Map.of("rooms", 3, "area", 110L), form.modelInput(MODEL, values));
        assertEquals(Map.of("Rooms", 3, "Area history", ROWS), form.storedInputs(values));
    }

    @Test
    void aSeriesRoutedToAModelKeepsItsRowsAndNotItsAggregations() {
        PublicForm form = PublicForm.of(Map.of("fields", List.of(series("history")), "reports", List.of()),
                List.of(MODEL));

        Map<String, Object> values = Map.of("in0", ROWS);
        assertEquals(Map.of("history", ROWS, "area", 110L), form.modelInput(MODEL, values));
        assertEquals(Map.of("Area history", ROWS), form.storedInputs(values));
    }

    @Test
    void aSeriesSentNoRowsGivesItsModelTheAggregationOfNone() {
        Map<String, Object> series = series(null);
        series.put("aggregations", List.of(
                Map.of("operation", "mean", "label", "Mean", "source", "field2", "mappedTo", "area"),
                Map.of("operation", "count", "label", "Count", "source", "field2", "mappedTo", "years")));
        PublicForm form = PublicForm.of(Map.of("fields", List.of(series), "reports", List.of()), List.of(MODEL));

        Map<String, Object> routed = new HashMap<>();
        routed.put("area", null);
        routed.put("years", 0L);
        assertEquals(routed, form.modelInput(MODEL, Map.of()));
        assertEquals(Map.of(), form.storedInputs(Map.of()));
    }

    @Test
    void aSeriesKeyTakesTheRowsItsColumnsDefineAndEveryOtherKeyAScalar() {
        PublicForm form = PublicForm.of(Map.of("fields", List.of(ROOMS, dated()), "reports", List.of()),
                List.of(MODEL));
        List<Map<String, Object>> rows = List.of(
                Map.of("date", "2024-03-01T00:00:00.000Z", "area", 90),
                Map.of("date", "2024-04-01", "area", 95.5),
                Collections.singletonMap("area", null));

        PublicFormValues.require(form, Map.of("in0", 5, "in1", rows.subList(0, 2)));
        PublicFormValues.require(form, Map.of("in1", List.of()));
        PublicFormValues.require(form, Map.of());
    }

    @Test
    void aSeriesDateIsKeptAsTheInstantTheFormSendsHoweverItWasWritten() {
        PublicForm form = PublicForm.of(Map.of("fields", List.of(ROOMS, dated()), "reports", List.of()),
                List.of(MODEL));
        List<Map<String, Object>> rows = List.of(
                Map.of("date", "2024-04-01", "area", 90),
                Map.of("date", "2024-04-01T02:30:00.5+02:00", "area", 95),
                Map.of("date", "2024-03-01T00:00:00.000Z", "area", 100));

        Map<String, Object> accepted = PublicFormValues.require(form, Map.of("in0", 5, "in1", rows));

        List<Map<String, Object>> instants = List.of(
                Map.of("date", "2024-04-01T00:00:00.000Z", "area", 90),
                Map.of("date", "2024-04-01T00:30:00.500Z", "area", 95),
                Map.of("date", "2024-03-01T00:00:00.000Z", "area", 100));
        assertEquals(Map.of("in0", 5, "in1", instants), accepted);
        assertEquals(Map.of("Rooms", 5, "Area history", instants), form.storedInputs(accepted));
    }

    @Test
    void aSeriesIsHeldToItsPointsAndToAResultForEachAggregation() {
        Map<String, Object> series = dated();
        series.put("required", true);
        series.put("minPoints", 2);
        PublicForm form = PublicForm.of(Map.of("fields", List.of(ROOMS, series), "reports", List.of()),
                List.of(MODEL));
        Map<String, Object> row = Map.of("date", "2024-03-01T00:00:00.000Z", "area", 90);
        Map<Map<String, Object>, String> refused = Map.of(
                Map.of("in0", 5), "\"Area history\" is required.",
                Map.of("in1", List.of()), "\"Area history\" is required.",
                Map.of("in1", List.of(row)), "\"Area history\" needs at least 2 points.",
                Map.of("in1", Collections.nCopies(4, row)), "\"Area history\" takes at most 3 points.",
                Map.of("in1", List.of(row, Map.of("date", "2024-04-01"))),
                "\"Area history\" has too few or missing measurements to calculate \"Mean\".");

        refused.forEach((values, message) -> {
            ResponseStatusException error = assertThrows(ResponseStatusException.class,
                    () -> PublicFormValues.require(form, values));
            assertEquals(400, error.getStatusCode().value(), values.toString());
            assertEquals(message, error.getReason(), values.toString());
        });
        PublicFormValues.require(form, Map.of("in1", List.of(row, row)));
    }

    @Test
    void aSeriesThatCanBeInactiveIsHeldOnlyToItsMostPoints() {
        Map<String, Object> series = dated();
        series.put("required", true);
        series.put("minPoints", 2);
        series.put("inactiveFieldPolicy", "include");
        series.put("hiddenWhen", Map.of("kind", "field", "field", "rooms", "equals", 0));
        PublicForm form = PublicForm.of(Map.of("fields", List.of(ROOMS, series), "reports", List.of()),
                List.of(MODEL));
        Map<String, Object> row = Map.of("date", "2024-03-01T00:00:00.000Z", "area", 90);

        PublicFormValues.require(form, Map.of("in0", 0));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> PublicFormValues.require(form, Map.of("in1", Collections.nCopies(4, row))));
        assertEquals("\"Area history\" takes at most 3 points.", error.getReason());
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
                Map.of("in1", 90),
                Map.of("in1", List.of(List.of(90))),
                Map.of("in1", List.of(Map.of("area", 90, "owner", "x"))),
                Map.of("in1", List.of(Map.of("area", "90"))),
                Map.of("in1", List.of(Map.of("date", "March 1st"))),
                Map.of("in1", List.of(Map.of("date", "2024-03-01T00:00"))),
                Map.of("in1", List.of(Map.of("area", List.of(90)))),
                Map.of("in1", Collections.nCopies(PublicFormValues.MAX_ROWS + 1, row))));

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

    @Test
    void anAggregateSentInsteadOfItsRowsIsRefusedByTheSeriesAndAggregationLabels() {
        PublicForm form = PublicForm.of(Map.of("fields", List.of(ROOMS, dated()), "reports", List.of()),
                List.of(MODEL));
        Map<String, Object> row = Map.of("date", "2024-03-01T00:00:00.000Z", "area", 90);

        for (Map<String, Object> values : List.of(Map.<String, Object>of("in0", 3, "agg0", 95),
                Map.of("in0", 3, "in1", List.of(row), "agg0", 95))) {
            ResponseStatusException error = assertThrows(ResponseStatusException.class,
                    () -> PublicFormValues.require(form, values));
            assertEquals(400, error.getStatusCode().value());
            assertEquals("\"Area history\" is calculated from its rows; send the rows, not \"Mean\".",
                    error.getReason());
        }
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
