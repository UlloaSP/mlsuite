package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.util.MultiValueMap;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;

/**
 * A bulk upload's contract: a model runs a batch of records in one call, each record sealed on its
 * own as a single run's result, and the runs are then saved a batch at a time, all or none.
 */
class WorkspacePredictionBatchHttpTest extends PublicPredictionFixture {

    private final List<MultiValueMap<String, HttpEntity<?>>> sent = new ArrayList<>();

    @BeforeEach
    void signInTheOwner() {
        authorizeOwner();
        when(analyzer.post(eq("/predict/batch"), any())).thenAnswer(call -> {
            sent.add(call.getArgument(1));
            List<?> rows = objectMapper.readValue(data(call.getArgument(1)), List.class);
            return Map.of("rows", rows.stream().map(row -> ((Map<?, ?>) row).get("age") == null
                    ? Map.of("error", Map.of("status", 400, "detail", "Missing features: \"age\"."))
                    : Map.of("reports", List.of(CLASSIFIER))).toList());
        });
    }

    @Test
    void eachRecordIsSealedOnItsOwnAndTheRunsAreSavedTogether() throws Exception {
        JsonNode forest = predictBatch(forestModel.getId(), List.of(Map.of("age", 52), Map.of("age", 61)));
        JsonNode net = predictBatch(netModel.getId(), List.of(Map.of("age", 52), Map.of("age", 61)));

        assertEquals(1, sent.stream().filter(parts -> FOREST_SHA256.equals(artifact(parts))).count());
        assertEquals("[{\"age\":52},{\"age\":61}]", data(sent.get(0)));
        for (JsonNode result : forest.get("results")) {
            assertEquals("SUCCESS", result.get("status").asText());
            assertEquals("high", result.at("/output/reports/1/prediction").asText());
        }
        assertEquals(61, forest.at("/results/1/modelInput/age").asInt());

        long runs = count("PredictionRun");
        JsonNode saved = json(mockMvc.perform(saveMany(
                run("bulk-1", forest.at("/results/0/attestation").asText(), net.at("/results/0/attestation").asText()),
                run("bulk-2", forest.at("/results/1/attestation").asText(), net.at("/results/1/attestation").asText())))
                .andExpect(status().isCreated()).andReturn());

        assertEquals(runs + 2, count("PredictionRun"));
        assertEquals(2, saved.get("runIds").size());
    }

    @Test
    void aRecordTheModelRefusesIsASealedFailureAndTheOthersStand() throws Exception {
        JsonNode results = predictBatch(forestModel.getId(), List.of(Map.of("age", 52), Map.of("chol", 200)))
                .get("results");

        assertEquals("SUCCESS", results.get(0).get("status").asText());
        assertEquals("FAILED", results.get(1).get("status").asText());
        assertEquals("Missing features: \"age\".", results.get(1).get("errorMessage").asText());
        assertNull(results.get(1).at("/output/reports").textValue());
        assertEquals(200, results.get(1).at("/modelInput/chol").asInt());
    }

    @Test
    void aRuntimeThatFailsTheBatchGivesEveryRecordASealedFailure() throws Exception {
        when(analyzer.post(eq("/predict/batch"), any())).thenThrow(new AnalyzerServiceException(500, "boom"));

        JsonNode results = predictBatch(forestModel.getId(), List.of(Map.of("age", 52), Map.of("age", 61)))
                .get("results");

        for (JsonNode result : results) {
            assertEquals("FAILED", result.get("status").asText());
            assertEquals("boom", result.get("errorMessage").asText());
        }
    }

    @Test
    void aBatchHoldsOneToAHundredRecordsOfABoundModel() throws Exception {
        List<Map<String, Object>> tooMany = IntStream.range(0, 101).mapToObj(age -> Map.<String, Object>of("age", age)).toList();
        mockMvc.perform(batchRequest(forestModel.getId(), tooMany)).andExpect(status().isBadRequest());
        mockMvc.perform(batchRequest(forestModel.getId(), List.of())).andExpect(status().isBadRequest());
        mockMvc.perform(batchRequest(9_999_999L, List.of(Map.of("age", 52)))).andExpect(status().isBadRequest());

        verify(analyzer, never()).post(eq("/predict/batch"), any());
    }

    @Test
    void aSavedBatchIsAllOrNoneAndNamesTheRunThatWasRefused() throws Exception {
        JsonNode forest = predictBatch(forestModel.getId(), List.of(Map.of("age", 52), Map.of("age", 61)));
        JsonNode net = predictBatch(netModel.getId(), List.of(Map.of("age", 52), Map.of("age", 61)));
        long runs = count("PredictionRun");

        mockMvc.perform(saveMany(
                run("bulk-ok", forest.at("/results/0/attestation").asText(), net.at("/results/0/attestation").asText()),
                run("bulk-ok", forest.at("/results/1/attestation").asText(), net.at("/results/1/attestation").asText())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Prediction run name already exists: bulk-ok"));
        mockMvc.perform(saveMany(
                run("bulk-forged", forest.at("/results/0/attestation").asText(), "not-a-seal")))
                .andExpect(status().isBadRequest());

        assertEquals(runs, count("PredictionRun"));
        verify(analyzer, times(2)).post(eq("/predict/batch"), any());
    }

    private JsonNode predictBatch(long modelId, List<Map<String, Object>> rows) throws Exception {
        return json(mockMvc.perform(batchRequest(modelId, rows)).andExpect(status().isOk()).andReturn());
    }

    private MockHttpServletRequestBuilder batchRequest(long modelId, List<Map<String, Object>> rows) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("schemaVersionId", version.getId(), "modelId", modelId,
                "rows", rows));
        return signedIn(post("/api/schema-bookmarks/{id}/predictions/batch", bookmark.getId())
                .contentType(MediaType.APPLICATION_JSON).content(body), owner.getId());
    }

    private Map<String, Object> run(String name, String... seals) {
        return Map.of("schemaVersionId", version.getId(), "name", name, "inputData", Map.of("Age", 52),
                "results", List.of(seals).stream().map(seal -> Map.of("attestation", seal)).toList());
    }

    @SafeVarargs
    private MockHttpServletRequestBuilder saveMany(Map<String, Object>... runs) throws Exception {
        return signedIn(post("/api/schema-bookmarks/{id}/runs/batch", bookmark.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("runs", List.of(runs)))), owner.getId());
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
