package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;

import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;

/**
 * The runs an API key cannot make, over HTTP: each refusal with its status and message, none
 * of them kept, and none that the server could have refused earlier reaching the runtime.
 */
class ConsumerPredictionRefusalTest extends ConsumerPredictionFixture {

    @Test
    void aMissingWrongOrRevokedKeyIsRefusedAndARevokedKeysRunsKeepItsName() throws Exception {
        mockMvc.perform(predicting(secret, FEATURES)).andExpect(status().isOk());
        apiKeys.revokeKey(owner.getId(), single.getId(), keyNamed(single, "Lab2Pressure").getId());

        mockMvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON).content(FEATURES))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid API key."));
        for (String wrong : List.of("", "mls_not-a-key", secret)) {
            mockMvc.perform(predicting(wrong, FEATURES))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("Invalid API key."));
        }
        verify(analyzer, times(1)).post(eq("/predict"), any());
        assertEquals("Lab2Pressure", runsOf(single).getFirst().getCreatedByName());
    }

    @ParameterizedTest
    @ValueSource(strings = { "private", "archived" })
    void aKeyWorksOnlyWhileItsBookmarkIsPublic(String state) throws Exception {
        inTransaction(() -> {
            if (state.equals("private")) entityManager.find(SchemaBookmark.class, single.getId()).unpublish();
            if (state.equals("archived")) entityManager.find(Schema.class, schema.getId()).setArchivedAt(OffsetDateTime.now());
        });

        mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Public bookmark not found"));
        verifyNoInteractions(analyzer);
    }

    @Test
    void aKeyRunsOnlyABookmarkOfOneModelThatMayBePublic() throws Exception {
        mockMvc.perform(predicting(issue(bookmark, "Lab2Pressure"), FEATURES))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message")
                        .value("An API key runs a bookmark of exactly one model; this bookmark runs 2."));

        inTransaction(() -> entityManager.find(Model.class, forestModel.getId()).setModelSizeBytes(MB + 1));
        mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This bookmark cannot be run publicly."));
        verifyNoInteractions(analyzer);
    }

    @ParameterizedTest
    @ValueSource(strings = { "{}", "{\"features\":null}", "{\"features\":{\"age\":{\"$gt\":0}}}",
            "{\"features\":{\"age\":[1,2]}}", "{\"features\":{\"age\":1e400}}", "LONG" })
    void eachFeatureIsAScalar(String body) throws Exception {
        String sent = body.equals("LONG") ? "{\"features\":{\"site\":\"" + "x".repeat(257) + "\"}}" : body;

        mockMvc.perform(predicting(secret, sent)).andExpect(status().isBadRequest());

        verifyNoInteractions(analyzer);
        mockMvc.perform(predicting(secret, "{\"features\":{\"age\":\"52\",\"smoker\":true,\"site\":null}}"))
                .andExpect(status().isOk());
    }

    @Test
    void theKeyHolderReadsWhyTheModelRefusedTheRecordButNotHowTheServerFailed() throws Exception {
        when(analyzer.post(eq("/predict"), any()))
                .thenThrow(new AnalyzerServiceException(400, "Missing features: {'age'}"))
                .thenThrow(new AnalyzerServiceException(500, "Error during inference: /srv/models/forest.mlbundle"));

        mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.message").value("The model could not use these features: Missing features: {'age'}"));
        mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message").value("The prediction could not be completed. Try again later."));
        inTransaction(() -> entityManager.find(Model.class, forestModel.getId()).setArtifactSha256("0".repeat(64)));
        mockMvc.perform(predicting(secret, FEATURES)).andExpect(status().isBadGateway());
        assertEquals(List.of(), runsOf(single));
    }

    @ParameterizedTest
    @ValueSource(strings = { "{", "[]", "{\"features\":[]}", "null" })
    void aBodyThatIsNotTheEndpointsJsonIsRefused(String body) throws Exception {
        mockMvc.perform(predicting(secret, body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("The request body is not valid JSON for this endpoint."));

        verifyNoInteractions(analyzer);
    }

    /** No reports, a report that is not one, an unknown kind, unpaired labels, a value that is not a number. */
    @ParameterizedTest
    @ValueSource(strings = { "{}", "{\"reports\":[]}", "{\"reports\":[\"high\"]}",
            "{\"reports\":[{\"kind\":\"Crystal Tree\",\"explanation\":\"age > 50\"}]}",
            "{\"reports\":[{\"kind\":\"classifier\",\"mapping\":[\"low\",\"high\"],\"probabilities\":[0.8]}]}",
            "{\"reports\":[{\"kind\":\"classifier\",\"mapping\":[\"low\",\"high\"],\"probabilities\":[]}]}",
            "{\"reports\":[{\"kind\":\"classifier\",\"mapping\":[\"low\",\"high\"],\"probabilities\":[0.2,\"x\"]}]}",
            "{\"reports\":[{\"kind\":\"regressor\",\"values\":[\"n/a\"]}]}",
            "{\"reports\":[{\"kind\":\"regressor\",\"values\":[]}]}" })
    void aMalformedRuntimeReplyIsAFailedRunAndIsNotKept(String reply) throws Exception {
        when(analyzer.post(eq("/predict"), any())).thenReturn(objectMapper.readValue(reply, Map.class));

        mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message").value("The prediction could not be completed. Try again later."));

        assertEquals(List.of(), runsOf(single));
        assertNull(keyNamed(single, "Lab2Pressure").getLastUsedAt());
    }
}
