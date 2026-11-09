package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.util.MultiValueMap;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

/**
 * A visitor's run of a form with a series field: the rows they entered are kept with the run,
 * and the model receives the aggregation the page computed from them, as a workspace run does.
 */
class PublicSeriesRunTest extends PublicPredictionFixture {

    private static final String ROWS = "[{\"date\":\"2024-03-01T00:00:00.000Z\",\"area\":90},"
            + "{\"date\":\"2024-04-01T00:00:00.000Z\",\"area\":110}]";

    private SchemaVersion seriesVersion;

    @BeforeEach
    void publishASeriesForm() {
        inTransaction(() -> {
            seriesVersion = new SchemaVersion(entityManager.find(Schema.class, schema.getId()), 4, "Series", Map.of(
                    "fields", List.of(
                            Map.of("kind", "number", "label", "Rooms", "mappedTo", Map.of("risk-forest", "rooms")),
                            Map.of("kind", "series", "label", "Area history", "maxPoints", 12,
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
    void aSeriesFieldsRowsAreKeptAndItsModelGetsTheirAggregation() throws Exception {
        List<MultiValueMap<String, HttpEntity<?>>> calls = new ArrayList<>();
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> {
            calls.add(call.getArgument(1));
            return Map.of("reports", List.of(CLASSIFIER));
        });

        String body = mockMvc.perform(running("{\"in0\":5,\"in2\":" + ROWS + ",\"in1\":100}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertEquals(1, calls.size());
        assertEquals("{\"rooms\":5,\"area\":100}", data(calls.get(0)));
        long runId = objectMapper.readTree(body).at("/run/id").asLong();
        PredictionRun run = entityManager.find(PredictionRun.class, runId);
        assertEquals(Map.of("Rooms", 5, "Area history", objectMapper.readValue(ROWS, List.class)), run.getInputData());
        PredictionResult result = entityManager
                .createQuery("select r from PredictionResult r where r.run.id = :id", PredictionResult.class)
                .setParameter("id", runId).getSingleResult();
        assertEquals(Map.of("rooms", 5, "area", 100), result.getModelInput());
    }

    @Test
    void rowsTheSeriesDoesNotDefineAreRefusedByTheFieldsLabel() throws Exception {
        mockMvc.perform(running("{\"in0\":5,\"in2\":[{\"area\":\"ninety\"}],\"in1\":100}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("\"Area history\" has a value the form cannot send."));
        mockMvc.perform(running("{\"in0\":[1],\"in1\":100}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("\"Rooms\" has a value the form cannot send."));
        verifyNoInteractions(analyzer);
    }

    private MockHttpServletRequestBuilder running(String values) {
        return post("/api/public/bookmarks/{publicId}/predictions", bookmark.getPublicId())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":" + seriesVersion.getVersion() + ",\"values\":" + values + "}");
    }
}
