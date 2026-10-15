package dev.ulloasp.mlsuite.apiaccess;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClient;
import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiRequest;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;

/**
 * The calls a client cannot make, over HTTP: each refusal answered as a problem with its code,
 * logged when a valid key made it, none of them kept as a run, and none that the server could
 * have refused earlier reaching the runtime.
 */
class ApiPredictionRefusalTest extends ApiAccessFixture {

    @Test
    void aMissingWrongOrRevokedKeyIsRefusedAndNotLogged() throws Exception {
        mockMvc.perform(predicting(secret, FEATURES)).andExpect(status().isOk());
        access.revokeKey(owner.getId(), clientId, keyNamed("Production").getId());

        mockMvc.perform(post(path(apiId)).contentType(MediaType.APPLICATION_JSON).content(FEATURES))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("invalid_key"))
                .andExpect(jsonPath("$.title").value("Invalid API key"))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.requestId").doesNotExist())
                .andExpect(header().doesNotExist("X-Request-Id"));
        for (String wrong : List.of("", "mls_not-a-key", secret)) {
            mockMvc.perform(predicting(wrong, FEATURES))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("invalid_key"));
        }
        verify(analyzer, times(1)).post(eq("/predict"), any());
        assertEquals(1, calls().size());
    }

    @Test
    void aSuspendedClientIsRefusedWithItsCallLogged() throws Exception {
        inTransaction(() -> entityManager.find(ApiClient.class, clientId).suspend("Abuse", OffsetDateTime.now()));

        String requestId = mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("client_suspended"))
                .andReturn().getResponse().getHeader("X-Request-Id");

        ApiRequest call = calls().getFirst();
        assertEquals(requestId, call.getRequestId().toString());
        assertEquals(403, call.getStatus());
        assertEquals("client_suspended", call.getErrorCode());
        assertNull(call.getBookmarkId());
        verifyNoInteractions(analyzer);
    }

    @ParameterizedTest
    @ValueSource(strings = { "unknown", "not-given", "revoked", "archived" })
    void aBookmarkTheClientWasNotGivenIsNotFound(String state) throws Exception {
        String target = switch (state) {
            case "unknown" -> "no-such-bookmark";
            case "not-given" -> bookmark.getPublicId();
            default -> apiId;
        };
        if (state.equals("revoked")) access.revokeBookmark(owner.getId(), clientId, single.getId());
        if (state.equals("archived")) {
            inTransaction(() -> entityManager.find(Schema.class, schema.getId()).setArchivedAt(OffsetDateTime.now()));
        }

        mockMvc.perform(predicting(secret, target, FEATURES))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("bookmark_not_found"));
        verifyNoInteractions(analyzer);
        assertEquals("bookmark_not_found", calls().getFirst().getErrorCode());
    }

    @Test
    void aClientRunsOnlyABookmarkOfOneModelThatFitsTheSizeLimit() throws Exception {
        String twoModels = access.grantBookmark(owner.getId(), clientId, bookmark.getId()).bookmarks().stream()
                .filter(given -> given.id().equals(bookmark.getId())).findFirst().orElseThrow().apiId();
        mockMvc.perform(predicting(secret, twoModels, FEATURES))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("bookmark_not_runnable"))
                .andExpect(jsonPath("$.detail").value("Clients run a bookmark of exactly one model; this bookmark runs 2."));
        assertEquals("production", calls().getFirst().getBookmarkName());

        inTransaction(() -> entityManager.find(Model.class, forestModel.getId()).setModelSizeBytes(MB + 1));
        mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("This bookmark's model is too large to run for clients."));
        verifyNoInteractions(analyzer);
    }

    @ParameterizedTest
    @ValueSource(strings = { "{\"features\":{\"age\":{\"$gt\":0}}}", "{\"features\":{\"age\":[1,2]}}",
            "{\"features\":{\"age\":1e400}}", "LONG" })
    void eachFeatureIsAScalar(String body) throws Exception {
        String sent = body.equals("LONG") ? "{\"features\":{\"site\":\"" + "x".repeat(257) + "\"}}" : body;

        mockMvc.perform(predicting(secret, sent))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("invalid_features"));

        verifyNoInteractions(analyzer);
        mockMvc.perform(predicting(secret, "{\"features\":{\"age\":\"52\",\"smoker\":true,\"site\":null}}"))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = { "{", "[]", "{\"features\":[]}", "null", "{}", "{\"features\":null}" })
    void aBodyThatIsNotTheEndpointsJsonIsRefusedBeforeTheKeyIsRead(String body) throws Exception {
        mockMvc.perform(predicting(secret, body))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("invalid_body"));

        verifyNoInteractions(analyzer);
        assertEquals(List.of(), calls());
    }

    @Test
    void theClientReadsWhyTheModelRefusedTheRecordButNotHowTheServerFailed() throws Exception {
        when(analyzer.post(eq("/predict"), any()))
                .thenThrow(new AnalyzerServiceException(400, "Missing features: {'age'}"))
                .thenThrow(new AnalyzerServiceException(500, "Error during inference: /srv/models/forest.mlbundle"));

        mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.code").value("features_rejected"))
                .andExpect(jsonPath("$.detail").value("The model could not use these features: Missing features: {'age'}"));
        mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("runtime_failed"))
                .andExpect(jsonPath("$.detail").value("The prediction could not be completed. Try again later."));
        inTransaction(() -> entityManager.find(Model.class, forestModel.getId()).setArtifactSha256("0".repeat(64)));
        mockMvc.perform(predicting(secret, FEATURES)).andExpect(status().isBadGateway());
        assertEquals(List.of(), runsOf(single));
        assertEquals(List.of(502, 502, 422), calls().stream().map(ApiRequest::getStatus).toList());
    }

    /** No reports, a report that is not one, an unknown kind, unpaired labels, a value that is not a number. */
    @ParameterizedTest
    @ValueSource(strings = { "{}", "{\"reports\":[]}", "{\"reports\":[\"high\"]}",
            "{\"reports\":[{\"kind\":\"Crystal Tree\",\"explanation\":\"age > 50\"}]}",
            "{\"reports\":[{\"kind\":\"classifier\",\"mapping\":[\"low\",\"high\"],\"probabilities\":[0.8]}]}",
            "{\"reports\":[{\"kind\":\"classifier\",\"mapping\":[\"low\",\"high\"],\"probabilities\":[0.2,\"x\"]}]}",
            "{\"reports\":[{\"kind\":\"regressor\",\"values\":[\"n/a\"]}]}",
            "{\"reports\":[{\"kind\":\"regressor\",\"values\":[]}]}" })
    void aMalformedRuntimeReplyIsAFailedRunAndIsNotKept(String reply) throws Exception {
        when(analyzer.post(eq("/predict"), any())).thenReturn(objectMapper.readValue(reply, Map.class));

        mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("runtime_failed"));

        assertEquals(List.of(), runsOf(single));
        assertNull(keyNamed("Production").getLastUsedAt());
    }

    @Test
    void aClientMayMakeSixtyCallsAMinute() throws Exception {
        logCalls(60, 200, OffsetDateTime.now());

        String retryAfter = mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("rate_limited"))
                .andExpect(jsonPath("$.detail").value("This client may make 60 calls a minute."))
                .andReturn().getResponse().getHeader(HttpHeaders.RETRY_AFTER);

        int seconds = Integer.parseInt(retryAfter);
        assertTrue(seconds >= 1 && seconds <= 60, retryAfter);
        verifyNoInteractions(analyzer);
    }

    @Test
    void anOrganizationsClientsShareItsMonthlyLimitOfSucceededCalls() throws Exception {
        inTransaction(() -> entityManager.find(Organization.class, organization.getId()).setApiMonthlyCallLimit(2));
        logCalls(1, 422, OffsetDateTime.now().minusMinutes(5));
        logCalls(1, 200, OffsetDateTime.now().minusMinutes(5));

        mockMvc.perform(predicting(secret, FEATURES)).andExpect(status().isOk());
        mockMvc.perform(predicting(issue(clientId, "Second"), FEATURES))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("quota_exceeded"))
                .andExpect(header().exists(HttpHeaders.RETRY_AFTER));

        assertEquals("quota_exceeded", calls().getFirst().getErrorCode());
    }
}
