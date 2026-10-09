package dev.ulloasp.mlsuite.schema.catalog;

import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.AGE;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.JSON;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.SCORE;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.array;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.customReport;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.data;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.explanation;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.found;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.object;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.rows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import dev.ulloasp.mlsuite.schema.catalog.InferenceRowProjector.Row;

/** What one inference shows as a row: the contract the browser's table derived from the same payloads. */
class InferenceProjectionTest {

    private static final Duration PROMPT = Duration.ofSeconds(5);
    private static final String ASSESSMENT = "2:7:feedback:OUTPUT:0:output-feedback-assessment:1";

    @TestFactory
    Stream<DynamicTest> preservesPersistedProjectionContracts() throws Exception {
        JsonNode fixtures = InferenceCatalogFixtures.all();
        return IntStream.range(0, fixtures.size()).mapToObj(index -> DynamicTest.dynamicTest(
                "snapshot projection " + index, () -> {
                    JsonNode fixture = fixtures.get(index);
                    List<Row> actual = rows(fixture.get("data"));
                    for (JsonNode expected : fixture.get("rows")) {
                        long id = expected.get("item").get("id").longValue();
                        Row row = actual.stream().filter(item -> item.dto().item().id() == id).findFirst()
                                .orElseThrow();
                        assertEquals(expected.get("values"), JSON.valueToTree(row.dto().values()),
                                "values of run " + id);
                        assertEquals(expected.get("feedbackStatus").textValue(), row.dto().feedbackStatus().name());
                        JsonNode columns = JSON.readTree(JSON.writeValueAsString(row.columns()));
                        columns.forEach(column -> ((ObjectNode) column).remove(List.of("kind", "choices")));
                        assertEquals(expected.get("columns"), columns, "columns of run " + id);
                    }
                }));
    }

    @Test
    void preservesNumericFeedbackLabelsAndCompletionAcrossIntegerAndDecimalAnswers() throws Exception {
        ObjectNode data = data(0);
        ObjectNode result = data.at("/results/0").deepCopy();
        result.put("id", 21).put("modelId", 2);
        array(data, "/results").add(result);
        ObjectNode binding = data.at("/versions/0/bindings/0").deepCopy();
        binding.put("modelId", 2);
        array(data, "/versions/0/bindings").add(binding);
        object(data, "/versions/0/formSchema/reports/0/mappedTo").put("2", "score");
        object(data, "/results/0/output/reports/0").put("kind", "classifier").set("mapping", JSON.readTree("[0,1]"));
        object(data, "/feedback/0/value").put("output-feedback-assessment", 1);
        ObjectNode feedback = data.at("/feedback/0").deepCopy();
        feedback.put("id", 3).put("resultId", 21);
        ((ObjectNode) feedback.get("value")).put("output-feedback-assessment", 1.0);
        array(data, "/feedback").add(feedback);

        Row row = rows(data).getFirst();
        assertEquals(InferenceFeedbackStatus.COMPLETED, row.dto().feedbackStatus());
        assertEquals("Yes", row.dto().values().get(ASSESSMENT));
        assertEquals(InferenceJsonValues.json(Map.of("nested", List.of(1)), false),
                InferenceJsonValues.json(Map.of("nested", List.of(1.0)), false));
    }

    @Test
    void keepsJsonStringifyTextForUnstructuredCustomReports() throws Exception {
        Row row = rows(customReport(JSON.readTree("{\"score\":7.0,\"samples\":[1,2.0]}"))).getFirst();
        assertEquals("{\n  \"score\": 7,\n  \"samples\": [\n    1,\n    2\n  ]\n}", row.dto().values().get(SCORE));
        assertTrue(found(row, "\"score\": 7"));
    }

    @Test
    void readsNumbersTheWayTheFormThatStoredThemDid() {
        String paddedLikeTheBrowserTrims = (char) 0xA0 + "12" + (char) 0xFEFF;
        Map<Object, Double> numbers = Map.ofEntries(
                Map.entry("0x1A", 26.0), Map.entry(" 12 ", 12.0), Map.entry("1e3", 1000.0), Map.entry(".5", 0.5),
                Map.entry("5.", 5.0), Map.entry("+7", 7.0), Map.entry("0b101", 5.0), Map.entry("0o17", 15.0),
                Map.entry(paddedLikeTheBrowserTrims, 12.0), Map.entry(7, 7.0),
                Map.entry("Infinity", Double.POSITIVE_INFINITY), Map.entry("-Infinity", Double.NEGATIVE_INFINITY),
                Map.entry("0x" + "f".repeat(300), Double.POSITIVE_INFINITY));
        numbers.forEach((value, number) -> assertEquals(number, InferenceCatalogValues.number(value), "" + value));
        for (Object notANumber : List.of("3D", "5f", "0x1p3", "", "   ", "-0x1A", "1_000", "1,5", "0x", "NaN", true)) {
            assertTrue(Double.isNaN(InferenceCatalogValues.number(notANumber)), "" + notANumber);
        }
    }

    @Test
    void boundsWorkThatStoredPayloadsAskFor() throws Exception {
        assertEquals(InferenceFeedbackSteps.MAX_INDEXED_CLASSES, InferenceFeedbackSteps.indexedClasses(30_000_000));
        assertEquals(InferenceFeedbackSteps.MAX_INDEXED_CLASSES, InferenceFeedbackSteps.indexedClasses(1e300));
        assertEquals(3, InferenceFeedbackSteps.indexedClasses(2.7));
        assertEquals(1, InferenceFeedbackSteps.indexedClasses(-40));
        assertEquals(1, InferenceFeedbackSteps.indexedClasses("7"));
        assertEquals(1, InferenceFeedbackSteps.indexedClasses(null));

        ObjectNode hugeIndex = data(0);
        object(hugeIndex, "/results/0/output/reports/0").put("classIndex", 30_000_000);
        Row indexed = assertTimeoutPreemptively(PROMPT, () -> rows(hugeIndex).getFirst());
        assertEquals(InferenceFeedbackStatus.COMPLETED, indexed.dto().feedbackStatus());
        assertEquals("Yes", indexed.dto().values().get(ASSESSMENT));

        String spaces = " ".repeat(200_000);
        assertEquals("x |" + spaces + "y",
                assertTimeoutPreemptively(PROMPT, () -> reported(explanation("* x |" + spaces + "y"))));
        String tree = (String) assertTimeoutPreemptively(PROMPT, () -> reported(explanation("a||".repeat(100_000))));
        assertEquals(100_000, tree.lines().count());
        assertTrue(tree.length() < 100_000 * (2 * InferenceJsonValues.MAX_INDENT_LEVELS + 6));

        assertEquals("Age > 40\n└─ Income <= 900\n  └─ Risk: high",
                reported(explanation("* Age > 40 || |__ Income <= 900 || |__ Risk: high")));
        assertEquals("a\n└─ b | c", reported(explanation("* a | " + (char) 0xA0 + "| b | c")));
    }

    @Test
    void marksOnlyTheInferenceWhoseStoredPayloadCannotBeRead() throws Exception {
        ObjectNode data = data(0);
        object(data, "/results/0").putNull("output");
        List<Row> rows = rows(data);
        assertEquals(InferenceFeedbackStatus.ERROR, rows.get(0).dto().feedbackStatus());
        assertEquals(Map.of(AGE, 52, "2:input:income", 900), rows.get(0).dto().values());
        assertEquals(InferenceFeedbackStatus.PENDING, rows.get(1).dto().feedbackStatus());
        assertEquals("No", rows.get(1).dto().values().get(SCORE));
    }

    @Test
    void searchesWhatTheRowShows() throws Exception {
        JsonNode fixtures = InferenceCatalogFixtures.all();
        Row row = rows(fixtures.get(fixtures.size() - 1).get("data")).getFirst();
        // A value the run lacks leaves its place empty, exactly as the browser joined the same parts.
        assertEquals("case 4 risk    workspace 4 40 lugo yes yes agree", row.searchText());
        assertTrue(found(row, "  LUGO yes "));
        assertFalse(found(row, "risk workspace"));
    }

    /** What the first fixture's run shows for its report, had it been a custom one with the given payload. */
    private static Object reported(JsonNode payload) throws Exception {
        return rows(customReport(payload)).getFirst().dto().values().get(SCORE);
    }
}
