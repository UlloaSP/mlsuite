package dev.ulloasp.mlsuite.apiaccess;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.MultiValueMap;

import com.fasterxml.jackson.databind.JsonNode;
import com.zaxxer.hikari.HikariDataSource;

import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiClientKeyRepository;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiPredictionRequest;
import dev.ulloasp.mlsuite.apiaccess.application.port.in.ApiPredictionUseCase;
import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiRequest;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunOrigin;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.storage.ArtifactHash;

/**
 * The runs a client makes, end to end over HTTP: what reaches the runtime, what the client gets
 * back, what the organization keeps and logs, and what happens to the bookmark, the key and the
 * runtime meanwhile. {@link ApiPredictionRefusalTest} holds the calls refused.
 */
class ApiPredictionTest extends ApiAccessFixture {

    @Test
    void aClientsRunIsOneAuditEntryUnderTheClientWithTheCallsRequestId() throws Exception {
        long before = auditedRuns();

        JsonNode answer = objectMapper.readTree(mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());

        assertEquals(before + 1, auditedRuns());
        Map<String, Object> row = jdbc.queryForMap(
                "SELECT * FROM audit_event WHERE action = 'PREDICTION_RUN' ORDER BY id DESC LIMIT 1");
        assertEquals("API_CLIENT", row.get("actor_kind"));
        assertEquals("Lab2Pressure", row.get("actor_label"));
        assertEquals(null, row.get("actor_user_id"));
        assertEquals(organization.getId(), row.get("organization_id"));
        assertEquals(single.getId().toString(), row.get("target_id"));
        assertEquals(UUID.fromString(answer.get("requestId").asText()), row.get("request_id"));
        assertEquals(false, row.get("metadata").toString().contains(secret));
    }

    @Test
    void aCallThatRanNothingLeavesNoAuditEntry() throws Exception {
        long before = auditedRuns();

        mockMvc.perform(predicting("wrong-key", FEATURES)).andExpect(status().isUnauthorized());

        assertEquals(before, auditedRuns());
    }

    private long auditedRuns() {
        return jdbc.queryForObject("SELECT count(*) FROM audit_event WHERE action = 'PREDICTION_RUN'", Long.class);
    }

    @Autowired ApiClientKeyRepository keyRepository;
    @Autowired ApiPredictionUseCase predictions;
    @Autowired JdbcTemplate jdbc;

    @Test
    void aClientRunsAPrivateBookmarkAndLearnsWhatRanWhileTheRunIsKeptAndLogged() throws Exception {
        List<MultiValueMap<String, HttpEntity<?>>> sent = new ArrayList<>();
        List<String> held = new ArrayList<>();
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> {
            sent.add(call.getArgument(1));
            held.add("transaction " + TransactionSynchronizationManager.isActualTransactionActive() + ", connections "
                    + dataSource.unwrap(HikariDataSource.class).getHikariPoolMXBean().getActiveConnections());
            return ANSWER;
        });

        var response = mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().isOk())
                .andReturn().getResponse();

        JsonNode body = objectMapper.readTree(response.getContentAsString());
        String requestId = body.get("requestId").asText();
        assertEquals(requestId, response.getHeader("X-Request-Id"));
        assertEquals(apiId, body.at("/bookmark/id").asText());
        assertEquals("consumers", body.at("/bookmark/name").asText());
        assertEquals(4, body.at("/snapshot/version").asInt());
        assertEquals("Forest only", body.at("/snapshot/name").asText());
        assertEquals("risk-forest", body.at("/model/name").asText());
        assertEquals(ArtifactHash.sha256(FOREST_BYTES), body.at("/model/sha256").asText());
        assertEquals("[{\"prediction\":\"high\",\"probabilities\":{\"low\":0.2,\"high\":0.8}},{\"value\":41.5}]",
                body.get("outputs").toString());
        // The record goes as sent, to the one model, with no connection held and no explanation asked.
        assertEquals(1, sent.size());
        assertEquals(ArtifactHash.sha256(FOREST_BYTES), artifact(sent.get(0)));
        assertEquals("{\"age\":52,\"sex__male\":1}", data(sent.get(0)));
        assertEquals(List.of("transaction false, connections 0"), held);

        PredictionRun run = runsOf(single).getFirst();
        assertEquals(PredictionRunOrigin.API, run.getOrigin());
        assertEquals("Lab2Pressure", run.getCreatedByName());
        assertNull(run.getVisitor());
        assertEquals(singleVersion.getId(), run.getSchemaVersion().getId());
        assertEquals(Map.of("age", 52, "sex__male", 1), run.getInputData());
        PredictionResult result = entityManager
                .createQuery("select r from PredictionResult r where r.run.id = :id", PredictionResult.class)
                .setParameter("id", run.getId()).getSingleResult();
        assertEquals(forestModel.getId(), result.getModel().getId());
        assertEquals(4, ((List<?>) result.getOutput().get("reports")).size());

        ApiRequest call = calls().getFirst();
        assertEquals(requestId, call.getRequestId().toString());
        assertEquals(200, call.getStatus());
        assertNull(call.getErrorCode());
        assertEquals(run.getId(), call.getPredictionRunId());
        assertEquals(clientId, call.getClientId());
        assertEquals("Lab2Pressure", call.getClientName());
        assertEquals(secret.substring(0, 12), call.getKeyPrefix());
        assertEquals(single.getId(), call.getBookmarkId());
        assertEquals("consumers", call.getBookmarkName());
        assertNotNull(keyNamed("Production").getLastUsedAt());
    }

    @Test
    void aKeyRevokedWhileTheModelRanKeepsTheRunUnderItsClientsName() throws Exception {
        long keyId = keyNamed("Production").getId();
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> {
            access.revokeKey(owner.getId(), clientId, keyId);
            return ANSWER;
        });

        mockMvc.perform(predicting(secret, FEATURES)).andExpect(status().isOk());

        assertEquals("Lab2Pressure", runsOf(single).getFirst().getCreatedByName());
        assertNull(calls().getFirst().getKeyId());
    }

    @Test
    void aKeysLastUseOnlyMovesForward() {
        long keyId = keyNamed("Production").getId();
        OffsetDateTime later = OffsetDateTime.parse("2026-10-15T12:00:00Z");
        int[] updated = new int[3];

        inTransaction(() -> {
            updated[0] = keyRepository.markUsed(keyId, later);
            updated[1] = keyRepository.markUsed(keyId, later.minusMinutes(1));
            updated[2] = keyRepository.markUsed(-1L, later);
        });

        assertArrayEquals(new int[] { 1, 0, 0 }, updated);
        assertEquals(later.toInstant(), keyNamed("Production").getLastUsedAt().toInstant());
    }

    @Test
    void clientsHaveRuntimeSlotsOfTheirOwnApartFromThePublicPages() throws Exception {
        CountDownLatch running = new CountDownLatch(3);
        CountDownLatch finish = new CountDownLatch(1);
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> {
            running.countDown();
            assertTrue(finish.await(10, TimeUnit.SECONDS));
            return Map.of("reports", List.of(CLASSIFIER));
        });
        ApiPredictionRequest record = new ApiPredictionRequest(Map.of("age", 52));
        var first = CompletableFuture.supplyAsync(() -> predictions.predict(secret, apiId, record));
        var second = CompletableFuture.supplyAsync(() -> predictions.predict(secret, apiId, record));
        var visitor = CompletableFuture.supplyAsync(() -> run(bookmark.getPublicId(), request(Map.of("in0", 52))));
        assertTrue(running.await(10, TimeUnit.SECONDS));

        mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string(HttpHeaders.RETRY_AFTER, "2"))
                .andExpect(jsonPath("$.code").value("runtime_busy"));

        finish.countDown();
        first.get(10, TimeUnit.SECONDS);
        second.get(10, TimeUnit.SECONDS);
        visitor.get(10, TimeUnit.SECONDS);
        assertTrue(calls().stream()
                .anyMatch(call -> call.getStatus() == 503 && "runtime_busy".equals(call.getErrorCode())));
    }

    @Test
    void aBookmarkMovedWhileTheModelRanKeepsNoRun() throws Exception {
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> {
            inTransaction(() -> {
                SchemaVersion moved = new SchemaVersion(entityManager.find(Schema.class, schema.getId()), 5, "Next",
                        singleVersion.getFormSchema());
                entityManager.persist(moved);
                entityManager.find(SchemaBookmark.class, single.getId()).setVersion(moved);
            });
            return ANSWER;
        });

        mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("bookmark_changed"))
                .andExpect(jsonPath("$.detail").value("This bookmark changed while it ran. Run it again."));
        assertEquals(List.of(), runsOf(single));
        assertNull(keyNamed("Production").getLastUsedAt());
        assertEquals("bookmark_changed", calls().getFirst().getErrorCode());
    }

    @Test
    void anyOriginMayCallWithAKeyButNoCredentialsWhileEveryOtherPathKeepsItsOrigins() throws Exception {
        String client = "https://lab2pressure.example";
        mockMvc.perform(options(path(apiId)).header(HttpHeaders.ORIGIN, client)
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "content-type,x-mlsuite-key"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*"))
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS));
        mockMvc.perform(predicting(secret, FEATURES).header(HttpHeaders.ORIGIN, client))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, "X-Request-Id, Retry-After"));

        String publicRun = "/api/public/bookmarks/" + bookmark.getPublicId() + "/predictions";
        mockMvc.perform(options(publicRun).header(HttpHeaders.ORIGIN, client)
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden());
        mockMvc.perform(options(publicRun).header(HttpHeaders.ORIGIN, "http://localhost:5173")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }
}
