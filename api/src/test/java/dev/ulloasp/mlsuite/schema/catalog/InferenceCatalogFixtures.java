package dev.ulloasp.mlsuite.schema.catalog;

import java.io.IOException;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import dev.ulloasp.mlsuite.schema.application.dto.InferenceTableDto;
import dev.ulloasp.mlsuite.schema.catalog.InferenceRowProjector.Row;

/** The persisted projection fixtures, and table payloads shaped from the first of them. */
final class InferenceCatalogFixtures {

    static final String AGE = "2:input:age";
    static final String SCORE = "2:output:1:score";
    static final ObjectMapper JSON = new ObjectMapper().registerModule(new JavaTimeModule());
    static final InferenceCatalogText TEXT = InferenceCatalogText.of("en-US");

    private InferenceCatalogFixtures() {
    }

    static JsonNode all() throws IOException {
        try (var input = InferenceCatalogFixtures.class.getResourceAsStream("/inference-catalog-projections.json")) {
            return JSON.readTree(input);
        }
    }

    /** A copy of one fixture's table payload: two runs of one schema, the newest first. */
    static ObjectNode data(int index) throws IOException {
        return all().get(index).get("data").deepCopy();
    }

    /** The first fixture's newest snapshot with one run per age, numbered and dated oldest first, without results. */
    static ObjectNode ages(Object... ages) throws IOException {
        ObjectNode data = data(0);
        JsonNode template = data.at("/runs/0");
        ArrayNode runs = data.putArray("runs");
        for (int index = 0; index < ages.length; index++) {
            ObjectNode run = template.deepCopy();
            object(run, "/summary").put("id", index + 1).put("name", "Case " + (index + 1))
                    .put("createdAt", "2026-07-" + String.format("%02d", index + 1) + "T08:00:00Z");
            run.putObject("inputData").set("age", JSON.valueToTree(ages[index]));
            runs.add(run);
        }
        data.putArray("results");
        data.putArray("feedback");
        return data;
    }

    /** The first fixture with its report turned into a custom one that produced the given payload. */
    static ObjectNode customReport(JsonNode payload) throws IOException {
        ObjectNode data = data(0);
        object(data, "/versions/0/formSchema/reports/0").put("kind", "custom").remove("labels");
        object(data, "/results/0/output/reports/0").set("payload", payload);
        return data;
    }

    static JsonNode explanation(String text) {
        return JSON.createObjectNode().put("explanation", text);
    }

    /** The payload as the reader delivers it, with its runs renamed in order when names are given. */
    static InferenceTableDto table(JsonNode data, String... names) throws IOException {
        for (int index = 0; index < names.length; index++) {
            object(data, "/runs/" + index + "/summary").put("name", names[index]);
        }
        return JSON.treeToValue(data, InferenceTableDto.class);
    }

    static List<Row> rows(JsonNode data) throws IOException {
        return new InferenceRowProjector(TEXT).project(table(data));
    }

    /** Whether a search for the query, and nothing else, finds the row. */
    static boolean found(Row row, String query) {
        return InferenceCatalogFilter.of(new InferenceCatalogRequest(
                0, 1, query, "all", "all", "all", "all", "all", "createdAt.desc", "en-US", List.of())).matches(row);
    }

    static ObjectNode object(JsonNode node, String pointer) {
        return (ObjectNode) node.at(pointer);
    }

    static ArrayNode array(JsonNode node, String pointer) {
        return (ArrayNode) node.at(pointer);
    }
}
