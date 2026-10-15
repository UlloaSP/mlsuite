package dev.ulloasp.mlsuite.schema;

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
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.MultiValueMap;

import com.zaxxer.hikari.HikariDataSource;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.BookmarkApiKeyRepository;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunOrigin;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

/**
 * The runs made with an API key, end to end over HTTP: what reaches the runtime, what the
 * consumer gets back, what the organization keeps, and what happens to the bookmark, its key
 * and the runtime meanwhile. {@link ConsumerPredictionRefusalTest} holds the runs refused.
 */
class ConsumerPredictionTest extends ConsumerPredictionFixture {

    @Autowired BookmarkApiKeyRepository keyRepository;

    @Test
    void aKeyRunsTheModelAndTheConsumerGetsOnlyItsOutputsWhileTheRunIsKept() throws Exception {
        List<MultiValueMap<String, HttpEntity<?>>> calls = new ArrayList<>();
        List<String> held = new ArrayList<>();
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> {
            calls.add(call.getArgument(1));
            held.add("transaction " + TransactionSynchronizationManager.isActualTransactionActive() + ", connections "
                    + dataSource.unwrap(HikariDataSource.class).getHikariPoolMXBean().getActiveConnections());
            return ANSWER;
        });

        String body = mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertEquals("{\"outputs\":[{\"prediction\":\"high\",\"probabilities\":{\"low\":0.2,\"high\":0.8}},"
                + "{\"value\":41.5}]}", body);
        // The record goes as sent, to the one model, with no connection held and no explanation asked.
        assertEquals(1, calls.size());
        assertEquals("forest.mlbundle", fileName(calls.get(0)));
        assertEquals("{\"age\":52,\"sex__male\":1}", data(calls.get(0)));
        assertEquals(List.of("transaction false, connections 0"), held);

        PredictionRun run = runsOf(single).getFirst();
        assertEquals(PredictionRunOrigin.API, run.getOrigin());
        assertEquals("Lab2Pressure", run.getCreatedByName());
        assertNull(run.getCreatedByEmail());
        assertNull(run.getVisitor());
        assertEquals(singleVersion.getId(), run.getSchemaVersion().getId());
        assertTrue(run.getName().startsWith("api-"), run.getName());
        assertEquals(Map.of("age", 52, "sex__male", 1), run.getInputData());
        PredictionResult result = entityManager
                .createQuery("select r from PredictionResult r where r.run.id = :id", PredictionResult.class)
                .setParameter("id", run.getId()).getSingleResult();
        assertEquals(forestModel.getId(), result.getModel().getId());
        assertEquals(Map.of("age", 52, "sex__male", 1), result.getModelInput());
        // The runtime's reports, then the copy a workspace run keeps per report of the bookmark's form.
        List<?> reports = (List<?>) result.getOutput().get("reports");
        assertEquals(4, reports.size());
        Map<?, ?> risk = (Map<?, ?>) reports.get(2);
        assertEquals("Risk", risk.get("id"));
        assertEquals("0", risk.get("mappedTo"));
        assertEquals(List.of("low", "high"), risk.get("labels"));
        assertEquals(List.of(0.2, 0.8), risk.get("probabilities"));
        assertEquals("high", risk.get("prediction"));
        assertEquals(List.of(41.5), ((Map<?, ?>) reports.get(3)).get("values"));
        assertNotNull(keyNamed(single, "Lab2Pressure").getLastUsedAt());
    }

    @Test
    void aKeyRevokedWhileTheModelRanKeepsTheRunUnderItsName() throws Exception {
        long keyId = keyNamed(single, "Lab2Pressure").getId();
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> {
            apiKeys.revokeKey(owner.getId(), single.getId(), keyId);
            return ANSWER;
        });

        mockMvc.perform(predicting(secret, FEATURES)).andExpect(status().isOk());

        List<PredictionRun> runs = runsOf(single);
        assertEquals(1, runs.size());
        assertEquals("Lab2Pressure", runs.getFirst().getCreatedByName());
    }

    @Test
    void aKeysLastUseOnlyMovesForward() {
        long keyId = keyNamed(single, "Lab2Pressure").getId();
        OffsetDateTime later = OffsetDateTime.parse("2026-10-15T12:00:00Z");
        int[] updated = new int[3];

        inTransaction(() -> {
            updated[0] = keyRepository.markUsed(keyId, later);
            updated[1] = keyRepository.markUsed(keyId, later.minusMinutes(1));
            updated[2] = keyRepository.markUsed(-1L, later);
        });

        assertArrayEquals(new int[] { 1, 0, 0 }, updated);
        assertEquals(later.toInstant(), keyNamed(single, "Lab2Pressure").getLastUsedAt().toInstant());
    }

    @Test
    void keyRunsShareThePublicRunsRuntimeSlots() throws Exception {
        CountDownLatch running = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> {
            running.countDown();
            assertTrue(finish.await(10, TimeUnit.SECONDS));
            return Map.of("reports", List.of(CLASSIFIER));
        });
        var visitorRun = CompletableFuture.supplyAsync(() -> run(bookmark.getPublicId(), request(Map.of("in0", 52))));
        assertTrue(running.await(10, TimeUnit.SECONDS));

        mockMvc.perform(predicting(secret, FEATURES))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("Too many public runs are in progress. Try again in a moment."));

        finish.countDown();
        visitorRun.get(10, TimeUnit.SECONDS);
        when(analyzer.post(eq("/predict"), any())).thenReturn(ANSWER);
        mockMvc.perform(predicting(secret, FEATURES)).andExpect(status().isOk());
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
                .andExpect(jsonPath("$.message").value("This bookmark changed while it ran. Run it again."));
        assertEquals(List.of(), runsOf(single));
        assertNull(keyNamed(single, "Lab2Pressure").getLastUsedAt());
    }

    @Test
    void anyOriginMayCallWithAKeyButNoCredentialsWhileEveryOtherPathKeepsItsOrigins() throws Exception {
        String consumer = "https://lab2pressure.example";
        mockMvc.perform(options(PATH).header(HttpHeaders.ORIGIN, consumer)
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "content-type,x-mlsuite-key"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*"))
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS));
        mockMvc.perform(predicting(secret, FEATURES).header(HttpHeaders.ORIGIN, consumer))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*"));

        String publicRun = "/api/public/bookmarks/" + bookmark.getPublicId() + "/predictions";
        mockMvc.perform(options(publicRun).header(HttpHeaders.ORIGIN, consumer)
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden());
        mockMvc.perform(options(publicRun).header(HttpHeaders.ORIGIN, "http://localhost:5173")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }
}
