package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * A session's runs are saved a batch at a time, each from the seals of predictions the server
 * performed, all or none.
 */
class WorkspaceRunsBatchHttpTest extends PublicPredictionFixture {

    @BeforeEach
    void signInTheOwner() {
        authorizeOwner();
    }

    @Test
    void sealedRunsAreSavedTogether() throws Exception {
        long runs = count("PredictionRun");

        JsonNode saved = json(mockMvc.perform(saveMany(run("session-1", seals()), run("session-2", seals())))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));

        assertEquals(runs + 2, count("PredictionRun"));
        assertEquals(2, saved.get("runIds").size());
    }

    @Test
    void aSavedBatchIsAllOrNoneAndNamesTheRunThatWasRefused() throws Exception {
        long runs = count("PredictionRun");

        mockMvc.perform(saveMany(run("session-ok", seals()), run("session-ok", seals())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Prediction run name already exists: session-ok"));
        mockMvc.perform(saveMany(run("session-forged", List.of(seals().get(0), "not-a-seal"))))
                .andExpect(status().isBadRequest());

        assertEquals(runs, count("PredictionRun"));
    }

    /** One sealed prediction per bound model, as a member's run gets them. */
    private List<String> seals() throws Exception {
        return List.of(seal(forestModel.getId(), Map.of("age", 52)), seal(netModel.getId(), Map.of("1", 52)));
    }

    private String seal(long modelId, Map<String, Object> input) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("schemaVersionId", version.getId(), "modelId", modelId,
                "modelInput", input));
        return json(mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/predictions", bookmark.getId())
                .contentType(MediaType.APPLICATION_JSON).content(body), owner.getId()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8))
                .get("attestation").asText();
    }

    private Map<String, Object> run(String name, List<String> seals) {
        return Map.of("schemaVersionId", version.getId(), "name", name, "inputData", Map.of("Age", 52),
                "results", seals.stream().map(seal -> Map.of("attestation", seal)).toList());
    }

    @SafeVarargs
    private MockHttpServletRequestBuilder saveMany(Map<String, Object>... runs) throws Exception {
        return signedIn(post("/api/schema-bookmarks/{id}/runs/batch", bookmark.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("runs", List.of(runs)))), owner.getId());
    }

    private JsonNode json(String body) throws Exception {
        return objectMapper.readTree(body);
    }
}
