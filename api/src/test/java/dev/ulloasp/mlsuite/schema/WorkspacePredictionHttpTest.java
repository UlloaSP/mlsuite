package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.MultiValueMap;

import com.fasterxml.jackson.databind.JsonNode;
import com.zaxxer.hikari.HikariDataSource;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

/**
 * The HTTP contract of a workspace run: the server performs each prediction and seals it, and
 * saving keeps only sealed results. The route that let a client run a model and keep whatever
 * it reported is gone. The runtime is asked for a model by its artifact's hash, no connection is
 * held while it works, and a run finding the workspace share in use is answered 503 (the fixture
 * allows one at a time).
 */
class WorkspacePredictionHttpTest extends PublicPredictionFixture {

    private static final Map<String, Object> EXPLANATION = Map.of("kind", "Crystal Tree", "explanation", "age > 50");

    private final List<MultiValueMap<String, HttpEntity<?>>> sent = new ArrayList<>();
    private final List<String> held = new ArrayList<>();

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
    void aRunNamesTheModelByItsArtifactAndHoldsNoConnectionWhileTheRuntimeWorks() throws Exception {
        explainTheForest();
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> recorded(call.getArgument(1),
                Map.of("reports", List.of(CLASSIFIER))));
        when(analyzer.post(eq("/explain"), any())).thenAnswer(call -> recorded(call.getArgument(1),
                Map.of("reports", List.of(EXPLANATION))));

        JsonNode forest = predict(forestModel.getId());

        List<String> explained = new ArrayList<>();
        forest.at("/output/reports").forEach(report -> explained.add(report.path("explanation").asText(null)));
        assertTrue(explained.contains("age > 50"), explained::toString);
        assertEquals(2, sent.size());
        for (MultiValueMap<String, HttpEntity<?>> parts : sent) {
            assertEquals(FOREST_SHA256, artifact(parts));
            assertNull(parts.getFirst("model_file"));
            assertEquals("{\"age\":52}", data(parts));
        }
        assertEquals("[]", sent.get(1).getFirst("traces").getBody());
        assertEquals(List.of("transaction false, connections 0", "transaction false, connections 0"), held);
    }

    @Test
    void anExplanationHoldsNoConnectionWhileTheRuntimeWorks() throws Exception {
        when(analyzer.post(eq("/explain"), any())).thenAnswer(call -> recorded(call.getArgument(1),
                Map.of("reports", List.of(EXPLANATION))));

        mockMvc.perform(signedIn(post("/api/analyzer/explanations")
                        .param("modelId", String.valueOf(forestModel.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"instance\":{\"age\":52},\"traces\":[]}"), owner.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reports[0].explanation").value("age > 50"));

        assertEquals(FOREST_SHA256, artifact(sent.get(0)));
        assertEquals(List.of("transaction false, connections 0"), held);
    }

    @Test
    void aRunFindingTheWorkspaceShareInUseIsAnswered503AndTheNextOneRuns() throws Exception {
        CountDownLatch running = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> {
            running.countDown();
            assertTrue(finish.await(10, TimeUnit.SECONDS));
            return Map.of("reports", List.of(CLASSIFIER));
        });
        var first = CompletableFuture.supplyAsync(() -> {
            try {
                return mockMvc.perform(predictRequest(forestModel.getId())).andReturn().getResponse().getStatus();
            } catch (Exception failure) {
                throw new IllegalStateException(failure);
            }
        });
        assertTrue(running.await(10, TimeUnit.SECONDS));

        mockMvc.perform(predictRequest(forestModel.getId()))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string(HttpHeaders.RETRY_AFTER, "2"))
                .andExpect(jsonPath("$.message").value("Too many workspace runs are in progress. Try again in a moment."));

        finish.countDown();
        assertEquals(200, first.get(10, TimeUnit.SECONDS));
        mockMvc.perform(predictRequest(forestModel.getId())).andExpect(status().isOk());
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

    /**
     * The instance-wide run counter told every organization how many runs all others made, and
     * the unbounded listings read every run, result and answer of the organization at once.
     */
    @Test
    void theGlobalRunCounterAndTheUnboundedRunListingsAreGone() throws Exception {
        for (String path : List.of("/api/prediction-runs/last-id", "/api/prediction-runs", "/api/prediction-runs/table",
                "/api/schema-bookmarks/" + bookmark.getId() + "/runs")) {
            int status = mockMvc.perform(signedIn(get(path), owner.getId())).andReturn().getResponse().getStatus();
            assertTrue(status == 404 || status == 405 || status == 400, path + " answered " + status);
        }
    }

    /** A result as clients used to send it: an output of their own under a real model. */
    private static Map<String, Object> written(long modelId) {
        return Map.of("modelId", modelId, "modelInput", Map.of("age", 52),
                "output", Map.of("reports", List.of(Map.of("kind", "classifier", "mappedTo", "risk", "prediction", "low"))),
                "status", "SUCCESS");
    }

    /** Gives the forest a plugin report, which a run fills with the runtime's explanation. */
    private void explainTheForest() {
        inTransaction(() -> {
            SchemaVersion stored = entityManager.find(SchemaVersion.class, version.getId());
            Map<String, Object> form = new LinkedHashMap<>(stored.getFormSchema());
            List<Object> reports = new ArrayList<>((List<?>) form.get("reports"));
            reports.add(Map.of("kind", "Crystal Tree", "label", "Path", "mappedTo", Map.of("risk-forest", "tree")));
            form.put("reports", reports);
            stored.setFormSchema(form);
        });
    }

    private Map<String, Object> recorded(MultiValueMap<String, HttpEntity<?>> parts, Map<String, Object> answer)
            throws Exception {
        sent.add(parts);
        held.add("transaction " + TransactionSynchronizationManager.isActualTransactionActive() + ", connections "
                + dataSource.unwrap(HikariDataSource.class).getHikariPoolMXBean().getActiveConnections());
        return answer;
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
