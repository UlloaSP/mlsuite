package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import tools.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

/**
 * A series' date cells are stored as one value whichever way a run arrives: the ISO instant the
 * form sends (MLForm's {@code toISOString}), so a date written alone, by a visitor or by a
 * client calling the workspace API, reads like the rest.
 */
class SeriesRunDatesTest extends PublicPredictionFixture {

    private static final List<Map<String, Object>> DAYS = List.of(
            Map.of("date", "2024-01-01", "area", 90), Map.of("date", "2024-02-01", "area", 110));
    private static final List<Map<String, Object>> INSTANTS = List.of(
            Map.of("date", "2024-01-01T00:00:00.000Z", "area", 90),
            Map.of("date", "2024-02-01T00:00:00.000Z", "area", 110));

    private SchemaVersion seriesVersion;

    @BeforeEach
    void publishASeriesForm() {
        when(analyzer.post(eq("/predict"), any())).thenReturn(Map.of("reports", List.of(CLASSIFIER)));
        inTransaction(() -> {
            seriesVersion = new SchemaVersion(entityManager.find(Schema.class, schema.getId()), 4, "Series", Map.of(
                    "fields", List.of(Map.of("kind", "series", "label", "Area history",
                            "columns", List.of(Map.of("id", "date", "kind", "date", "label", "Date"),
                                    Map.of("id", "area", "kind", "number", "label", "Area")),
                            "aggregations", List.of(Map.of("operation", "mean", "label", "Mean area",
                                    "source", "area", "mappedTo", Map.of("risk-forest", "area"))))),
                    "reports", List.of(Map.of("kind", "classifier", "label", "Risk",
                            "mappedTo", Map.of("risk-forest", "risk")))), principals.system());
            entityManager.persist(seriesVersion);
            entityManager.persist(new SchemaModelBinding(seriesVersion, forestModel, Map.of()));
            entityManager.find(SchemaBookmark.class, bookmark.getId()).setVersion(seriesVersion);
        });
    }

    @Test
    void aVisitorsDatesAreStoredAsInstants() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("version", seriesVersion.getVersion(),
                "values", Map.of("in0", DAYS)));
        String answer = mockMvc.perform(post("/api/public/bookmarks/{publicId}/predictions", bookmark.getPublicId())
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        long runId = objectMapper.readTree(answer).at("/run/id").asLong();
        assertEquals(Map.of("Area history", INSTANTS), entityManager.find(PredictionRun.class, runId).getInputData());
    }

    @Test
    void aWorkspaceRunsDatesAreStoredAsInstants() throws Exception {
        authorizeOwner();
        String predicted = mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/predictions", bookmark.getId())
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(Map.of(
                        "schemaVersionId", seriesVersion.getId(), "modelId", forestModel.getId(),
                        "modelInput", Map.of("area", 100), "inputData", Map.of("area", 100, "Area history", DAYS)))),
                owner.getId())).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String seal = objectMapper.readTree(predicted).get("attestation").asString();

        String saved = mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/runs", bookmark.getId())
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(Map.of(
                        "schemaVersionId", seriesVersion.getId(), "name", "case-1",
                        "results", List.of(Map.of("attestation", seal))))), owner.getId()))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();

        JsonNode run = objectMapper.readTree(mockMvc.perform(signedIn(get("/api/prediction-runs/{id}",
                objectMapper.readTree(saved).get("id").asLong()), owner.getId()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
        assertEquals(objectMapper.valueToTree(INSTANTS), run.at("/inputData/Area history"));
    }
}
