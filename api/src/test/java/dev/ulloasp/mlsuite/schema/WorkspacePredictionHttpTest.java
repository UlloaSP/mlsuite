package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * The HTTP contract of a workspace run: the server performs each prediction and seals it, and
 * saving keeps only sealed results. The route that let a client run a model and keep whatever
 * it reported is gone.
 */
class WorkspacePredictionHttpTest extends PublicPredictionFixture {

    @BeforeEach
    void signInTheOwner() {
        authorizeOwner();
    }

    @Test
    void aSavedRunKeepsWhatTheServerPredicted() throws Exception {
        JsonNode forest = predict(forestModel.getId());
        JsonNode net = predict(netModel.getId());
        assertEquals("SUCCESS", forest.get("status").asText());
        assertEquals("high", forest.at("/output/reports/1/prediction").asText());

        JsonNode saved = json(mockMvc.perform(save("case-1", forest.get("attestation").asText(),
                net.get("attestation").asText())).andExpect(status().isCreated()).andReturn());

        JsonNode read = json(mockMvc.perform(signedIn(get("/api/prediction-runs/{id}", saved.get("id").asLong()),
                owner.getId())).andExpect(status().isOk()).andReturn());
        assertEquals("SUCCESS", read.get("status").asText());
        for (JsonNode result : read.get("results")) {
            JsonNode predicted = result.get("modelId").asLong() == forestModel.getId() ? forest : net;
            assertEquals(predicted.get("output"), result.get("output"));
            assertEquals(predicted.get("modelInput"), result.get("modelInput"));
            assertEquals("SUCCESS", result.get("status").asText());
        }
    }

    @Test
    void aChangedOutputIsRefusedAndNothingIsSaved() throws Exception {
        String seal = predict(forestModel.getId()).get("attestation").asText();
        String payload = new String(Base64.getUrlDecoder().decode(seal.substring(0, seal.indexOf('.'))),
                StandardCharsets.UTF_8);
        String tampered = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.replace("\"high\"", "\"low\"").getBytes(StandardCharsets.UTF_8))
                + seal.substring(seal.indexOf('.'));
        long runs = count("PredictionRun");

        mockMvc.perform(save("case-2", tampered, predict(netModel.getId()).get("attestation").asText()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "A prediction result was not produced by this server; run the inference again before saving"));

        assertEquals(runs, count("PredictionRun"));
    }

    @Test
    void aRunCannotBeSavedWithOutputsTheClientWrote() throws Exception {
        long runs = count("PredictionRun");
        String body = objectMapper.writeValueAsString(Map.of("schemaVersionId", version.getId(), "name", "case-3",
                "inputData", Map.of("Age", 52), "results", List.of(written(forestModel.getId()), written(netModel.getId()))));

        mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/runs", bookmark.getId())
                .contentType(MediaType.APPLICATION_JSON).content(body), owner.getId()))
                .andExpect(status().isBadRequest());

        assertEquals(runs, count("PredictionRun"));
    }

    @Test
    void aPredictionForAModelTheSnapshotDoesNotBindIsRefused() throws Exception {
        mockMvc.perform(predictRequest(9_999_999L)).andExpect(status().isBadRequest());

        verify(analyzer, never()).post(eq("/predict"), any());
    }

    @Test
    void theRawPredictionRouteIsGone() throws Exception {
        mockMvc.perform(signedIn(post("/api/analyzer/predictions").param("modelId", String.valueOf(forestModel.getId()))
                .contentType(MediaType.APPLICATION_JSON).content("{\"age\":52}"), owner.getId()))
                .andExpect(status().is4xxClientError());

        verify(analyzer, never()).post(eq("/predict"), any());
    }

    /** A result as clients used to send it: an output of their own under a real model. */
    private static Map<String, Object> written(long modelId) {
        return Map.of("modelId", modelId, "modelInput", Map.of("age", 52),
                "output", Map.of("reports", List.of(Map.of("kind", "classifier", "mappedTo", "risk", "prediction", "low"))),
                "status", "SUCCESS");
    }

    private JsonNode predict(long modelId) throws Exception {
        return json(mockMvc.perform(predictRequest(modelId)).andExpect(status().isOk()).andReturn());
    }

    private MockHttpServletRequestBuilder predictRequest(long modelId) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("schemaVersionId", version.getId(), "modelId", modelId,
                "modelInput", Map.of("age", 52)));
        return signedIn(post("/api/schema-bookmarks/{id}/predictions", bookmark.getId())
                .contentType(MediaType.APPLICATION_JSON).content(body), owner.getId());
    }

    private MockHttpServletRequestBuilder save(String name, String... seals) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("schemaVersionId", version.getId(), "name", name,
                "inputData", Map.of("Age", 52),
                "results", List.of(seals).stream().map(seal -> Map.of("attestation", seal)).toList()));
        return signedIn(post("/api/schema-bookmarks/{id}/runs", bookmark.getId())
                .contentType(MediaType.APPLICATION_JSON).content(body), owner.getId());
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
