package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigInteger;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.MultiValueMap;
import org.springframework.web.server.ResponseStatusException;

import com.zaxxer.hikari.HikariDataSource;

import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionRequest;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;

/**
 * Ephemeral public execution, end to end: what a run sends to the runtime, what it answers,
 * what it refuses, and what it leaves behind (nothing). {@link PublicPredictionFixture} holds the
 * application context and the published bookmark these tests run.
 */
class PublicPredictionServiceTest extends PublicPredictionFixture {

    @Test
    void thePublicFormNamesNoModelAndNoFeature() throws Exception {
        PublicBookmarkDto view = publicBookmarks.getPublishedBookmark(bookmark.getPublicId());

        assertEquals(Map.of(
                "fields", List.of(
                        Map.of("kind", "number", "label", "Age", "mappedTo", "in0"),
                        Map.of("kind", "number", "label", "Cholesterol", "mappedTo", "in1"),
                        Map.of("kind", "onehot-category", "label", "Smoker", "options", List.of(
                                Map.of("label", "Yes", "value", "yes", "mappedTo", "in2"),
                                Map.of("label", "No", "value", "no", "mappedTo", "in3")))),
                "reports", List.of(
                        Map.of("kind", "classifier", "label", "Risk 1", "id", "out0", "mappedTo", "out0"),
                        Map.of("kind", "classifier", "label", "Risk 2", "id", "out1", "mappedTo", "out1"),
                        Map.of("kind", "regressor", "label", "Score", "id", "out2", "mappedTo", "out2"))),
                view.formSchema());
        String json = objectMapper.writeValueAsString(view);
        for (String secret : List.of("risk-forest", "risk-net", "smoker__", "chol", "joblib", "onnx")) {
            assertFalse(json.contains(secret), secret);
        }
    }

    @Test
    void aRunRoutesEachModelsFeaturesOnTheServerAndStoresNothing() throws Exception {
        List<MultiValueMap<String, HttpEntity<?>>> calls = new ArrayList<>();
        List<Boolean> transactionOpen = new ArrayList<>();
        List<Integer> connectionsHeld = new ArrayList<>();
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> {
            calls.add(call.getArgument(1));
            transactionOpen.add(TransactionSynchronizationManager.isActualTransactionActive());
            connectionsHeld.add(dataSource.unwrap(HikariDataSource.class).getHikariPoolMXBean().getActiveConnections());
            return Map.of("reports", calls.size() == 1 ? List.of(CLASSIFIER) : List.of(CLASSIFIER, REGRESSOR),
                    "meta", Map.of("modelId", "leaked"));
        });

        PublicPredictionDto result = run(bookmark.getPublicId(),
                request(Map.of("in0", 52, "in1", 240.5, "in2", 1, "in3", 0)));

        assertEquals(2, calls.size());
        assertEquals("risk.joblib", fileName(calls.get(0)));
        assertArrayEquals(JOBLIB_BYTES, (byte[]) calls.get(0).getFirst("model_file").getBody());
        assertEquals("{\"age\":52,\"chol\":240.5,\"smoker__yes\":1,\"smoker__no\":0}", data(calls.get(0)));
        assertEquals("risk.onnx", fileName(calls.get(1)));
        assertArrayEquals(ONNX_BYTES, (byte[]) calls.get(1).getFirst("model_file").getBody());
        // The positional model reads by position: 0 before 1, whatever the order of the fields.
        assertEquals("{\"0\":240.5,\"1\":52}", data(calls.get(1)));
        assertEquals(List.of(false, false), transactionOpen);
        assertEquals(List.of(0, 0), connectionsHeld);

        assertEquals(List.of("out0", "out1", "out2"), result.reports().stream().map(report -> report.key()).toList());
        assertEquals(List.of(CLASSIFIER, CLASSIFIER, REGRESSOR),
                result.reports().stream().map(report -> report.payload()).toList());
        String json = objectMapper.writeValueAsString(result);
        for (String secret : List.of("risk-forest", "risk-net", "risk.joblib", "leaked", "modelId")) {
            assertFalse(json.contains(secret), secret);
        }
        for (String entity : List.of("PredictionRun", "PredictionResult", "PredictionResultFeedback")) {
            assertEquals(0L, count(entity), entity);
        }
    }

    @Test
    void overHttpAnAnonymousRunHoldsNoDatabaseConnectionWhileTheRuntimeWorks() throws Exception {
        List<Integer> connectionsHeld = new ArrayList<>();
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> {
            connectionsHeld.add(dataSource.unwrap(HikariDataSource.class).getHikariPoolMXBean().getActiveConnections());
            return Map.of("reports", List.of(CLASSIFIER));
        });

        mockMvc.perform(post("/api/public/bookmarks/{publicId}/predictions", bookmark.getPublicId())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":3,\"values\":{\"in0\":52,\"in1\":240.5}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reports.length()").value(2))
                .andExpect(jsonPath("$.reports[0].key").value("out0"))
                .andExpect(jsonPath("$.reports[1].key").value("out1"));

        // Both models ran with the pool untouched: the request's read ended before the first call.
        assertEquals(List.of(0, 0), connectionsHeld);
        for (String entity : List.of("PredictionRun", "PredictionResult", "PredictionResultFeedback")) {
            assertEquals(0L, count(entity), entity);
        }
    }

    @Test
    void aReportNoModelAnsweredIsLeftOut() {
        when(analyzer.post(eq("/predict"), any())).thenReturn(Map.of("reports", List.of(REGRESSOR)));

        PublicPredictionDto result = run(bookmark.getPublicId(), request(Map.of("in0", 52)));

        assertEquals(List.of("out2"), result.reports().stream().map(report -> report.key()).toList());
    }

    @ParameterizedTest
    @ValueSource(strings = { "private", "archived", "unknown" })
    void aBookmarkThatIsNotPublicIsNotFound(String state) {
        inTransaction(() -> {
            if (state.equals("private")) entityManager.find(SchemaBookmark.class, bookmark.getId())
                    .setVisibility(BookmarkVisibility.PRIVATE);
            if (state.equals("archived")) entityManager.find(Schema.class, schema.getId())
                    .setArchivedAt(OffsetDateTime.now());
        });
        String publicId = state.equals("unknown") ? "no-such-bookmark" : bookmark.getPublicId();

        assertEquals(404, refused(publicId, request(Map.of())).getStatusCode().value());
        assertEquals(404, assertThrows(ResponseStatusException.class,
                () -> publicBookmarks.getPublishedBookmark(publicId)).getStatusCode().value());
        verifyNoInteractions(analyzer);
    }

    @Test
    void aPageRenderedBeforeTheBookmarkMovedCannotRunItsOldForm() {
        ResponseStatusException error = refused(bookmark.getPublicId(),
                new PublicPredictionRequest(version.getVersion() - 1, Map.of("in0", 52)));

        assertEquals(409, error.getStatusCode().value());
        assertTrue(error.getReason().contains("Reload the page"));
        verifyNoInteractions(analyzer);
    }

    @Test
    void aBookmarkWhoseModelOutgrewTheCeilingIsRefusedWithoutNamingIt() {
        inTransaction(() -> entityManager.find(Model.class, onnxModel.getId()).setModelSizeBytes(MB + 1));

        ResponseStatusException error = refused(bookmark.getPublicId(), request(Map.of("in0", 52)));

        assertEquals(409, error.getStatusCode().value());
        assertEquals("This bookmark cannot be run publicly.", error.getReason());
        verifyNoInteractions(analyzer);
    }

    @Test
    void onlyTheFormsOwnScalarValuesAreAccepted() {
        List<Map<String, Object>> rejected = List.of(
                Map.of("age", 52),
                Map.of("in0", 52, "in9", 1),
                Map.of("in0", Map.of("$gt", 0)),
                Map.of("in0", List.of(1, 2)),
                Map.of("in0", "x".repeat(257)),
                Map.of("in0", new BigInteger("9".repeat(40))),
                Map.of("in0", Double.POSITIVE_INFINITY));

        for (Map<String, Object> values : rejected) {
            assertEquals(400, refused(bookmark.getPublicId(), request(values)).getStatusCode().value(), values.toString());
        }
        verifyNoInteractions(analyzer);

        run(bookmark.getPublicId(), request(Map.of("in0", "52", "in1", true, "in2", 1L)));
    }

    @Test
    void whatTheRuntimeSaysStaysOnTheServer() {
        when(analyzer.post(eq("/predict"), any()))
                .thenThrow(new AnalyzerServiceException(400, "Missing features: {'age'}"))
                .thenThrow(new AnalyzerServiceException(500, "Error during inference: /srv/models/risk.joblib"))
                .thenThrow(new AnalyzerServiceException(0, "Analyzer service unreachable"))
                .thenThrow(new IllegalStateException("SHA-256 mismatch for model 7"));

        List<ResponseStatusException> errors = List.of(
                refused(bookmark.getPublicId(), request(Map.of("in0", 52))),
                refused(bookmark.getPublicId(), request(Map.of("in0", 52))),
                refused(bookmark.getPublicId(), request(Map.of("in0", 52))),
                refused(bookmark.getPublicId(), request(Map.of("in0", 52))));

        assertEquals(List.of(422, 502, 502, 502), errors.stream().map(error -> error.getStatusCode().value()).toList());
        assertEquals("The models could not use these values. Check the inputs and try again.", errors.get(0).getReason());
        for (ResponseStatusException error : errors.subList(1, 4)) {
            assertEquals("The prediction could not be completed. Try again later.", error.getReason());
        }
    }

    @Test
    void anArtifactThatFailsVerificationIsNeverSentToTheRuntime() {
        inTransaction(() -> entityManager.find(Model.class, joblibModel.getId()).setArtifactSha256("0".repeat(64)));

        assertEquals(502, refused(bookmark.getPublicId(), request(Map.of("in0", 52))).getStatusCode().value());
        verifyNoInteractions(analyzer);
    }

    @Test
    void runsBeyondTheConcurrencyCapAreTurnedAwayUntilASlotFrees() throws Exception {
        CountDownLatch running = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> {
            running.countDown();
            assertTrue(finish.await(10, TimeUnit.SECONDS));
            return Map.of("reports", List.of(CLASSIFIER));
        });
        var first = CompletableFuture.supplyAsync(
                () -> run(bookmark.getPublicId(), request(Map.of("in0", 52))));
        assertTrue(running.await(10, TimeUnit.SECONDS));

        ResponseStatusException busy = refused(bookmark.getPublicId(), request(Map.of("in0", 52)));
        assertEquals(503, busy.getStatusCode().value());
        assertEquals("Too many public runs are in progress. Try again in a moment.", busy.getReason());

        finish.countDown();
        assertEquals(2, first.get(10, TimeUnit.SECONDS).reports().size());
        // The slot is returned after a success and after a failure alike.
        when(analyzer.post(eq("/predict"), any())).thenThrow(new AnalyzerServiceException(500, "boom"));
        assertEquals(502, refused(bookmark.getPublicId(), request(Map.of("in0", 52))).getStatusCode().value());
        assertEquals(502, refused(bookmark.getPublicId(), request(Map.of("in0", 52))).getStatusCode().value());
    }
}
