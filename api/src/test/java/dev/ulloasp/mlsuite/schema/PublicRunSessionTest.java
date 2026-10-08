package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunDto;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunOrigin;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.security.identity.VisitorCookie;
import jakarta.servlet.http.Cookie;

/**
 * A visitor's session on a public page: the runs they made, kept for good as the organization's
 * inferences and read back by the browser that made them, and the feedback they give on them.
 */
class PublicRunSessionTest extends PublicPredictionFixture {

    private static final String FEEDBACK = "{\"items\":[{\"reportKey\":\"out0\",\"type\":\"OUTPUT\","
            + "\"value\":{\"output-feedback-assessment\":\"high\"}}]}";

    @Test
    void theFirstRunNamesTheBrowserWithACookieAndLaterRunsAreListedUnderIt() throws Exception {
        MvcResult first = mockMvc.perform(runRequest(bookmark.getPublicId()).header("X-Forwarded-Proto", "https"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.run.id").isNumber())
                .andExpect(jsonPath("$.run.version").value(3))
                .andExpect(jsonPath("$.run.inputs.Age").value(52))
                .andExpect(jsonPath("$.run.reports[0].key").value("out0"))
                .andExpect(jsonPath("$.run.feedback").isEmpty())
                .andReturn();
        String setCookie = first.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertNotNull(setCookie);
        for (String attribute : List.of("HttpOnly", "Secure", "SameSite=Lax", "Path=/api/public", "Max-Age=31536000")) {
            assertTrue(setCookie.contains(attribute), setCookie);
        }
        Cookie visitor = cookie(setCookie);

        // The cookie is kept: the second run is not given another.
        mockMvc.perform(runRequest(bookmark.getPublicId()).cookie(visitor))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
        // Over plain HTTP, as in development, the cookie is not marked Secure.
        String plain = mockMvc.perform(runRequest(bookmark.getPublicId())).andReturn().getResponse()
                .getHeader(HttpHeaders.SET_COOKIE);
        assertFalse(plain.contains("Secure"), plain);

        mockMvc.perform(get("/api/public/bookmarks/{publicId}/runs", bookmark.getPublicId()).cookie(visitor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].inputs.Age").value(52))
                .andExpect(jsonPath("$[0].reports.length()").value(3));
        // Another browser, or none, sees nothing of these runs.
        mockMvc.perform(get("/api/public/bookmarks/{publicId}/runs", bookmark.getPublicId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/public/bookmarks/{publicId}/runs", bookmark.getPublicId()).cookie(cookie(plain)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        long runId = read(first).run().id();
        mockMvc.perform(get("/api/public/bookmarks/{publicId}/runs/{runId}", bookmark.getPublicId(), runId).cookie(cookie(plain)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/public/bookmarks/{publicId}/runs/{runId}", bookmark.getPublicId(), runId).cookie(visitor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(runId));
    }

    @Test
    void aCookieNamingNoKnownVisitorIsReplaced() throws Exception {
        Cookie stale = new Cookie(VisitorCookie.NAME, UUID.randomUUID().toString());
        mockMvc.perform(get("/api/public/bookmarks/{publicId}/runs", bookmark.getPublicId()).cookie(stale))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        String issued = mockMvc.perform(runRequest(bookmark.getPublicId()).cookie(stale))
                .andExpect(status().isOk())
                .andReturn().getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertNotNull(issued);
        assertNotEquals(stale.getValue(), cookie(issued).getValue());
        // A cookie that is not an id at all is treated as none.
        mockMvc.perform(runRequest(bookmark.getPublicId()).cookie(new Cookie(VisitorCookie.NAME, "not-an-id")))
                .andExpect(status().isOk())
                .andExpect(header().exists(HttpHeaders.SET_COOKIE));
    }

    @Test
    void aKeptRunHasTheShapeOfAWorkspaceRunAndIsToldApartByItsOrigin() {
        PublicRunDto made = run(bookmark.getPublicId(),
                request(Map.of("in0", 52, "in1", 240.5, "in2", 1, "in3", 0))).run();

        PredictionRun run = entityManager.find(PredictionRun.class, made.id());
        assertEquals(PredictionRunOrigin.PUBLIC, run.getOrigin());
        assertNotNull(run.getVisitor());
        assertNull(run.getCreatedByName());
        assertEquals(bookmark.getId(), run.getSchemaBookmark().getId());
        assertEquals(version.getId(), run.getSchemaVersion().getId());
        assertTrue(run.getName().startsWith("visitor-"), run.getName());
        // Inputs by field, a one-hot field as the option chosen: what the workspace's Inputs tab reads.
        assertEquals(Map.of("Age", 52, "Cholesterol", 240.5, "Smoker", "yes"), run.getInputData());
        assertEquals(PredictionRunOrigin.PUBLIC, PredictionRunCatalogItemDto.from(run).origin());

        List<PredictionResult> results = entityManager
                .createQuery("select r from PredictionResult r where r.run.id = :id order by r.id", PredictionResult.class)
                .setParameter("id", run.getId()).getResultList();
        assertEquals(List.of(joblibModel.getId(), onnxModel.getId()),
                results.stream().map(result -> result.getModel().getId()).toList());
        PredictionResult forest = results.get(0);
        assertEquals(Map.of("age", 52, "chol", 240.5, "smoker__yes", 1, "smoker__no", 0), forest.getModelInput());
        // The runtime's reports, then the copy the workspace keeps per report the model serves.
        List<?> reports = (List<?>) forest.getOutput().get("reports");
        assertEquals(2, reports.size());
        assertEquals(CLASSIFIER, reports.get(0));
        Map<?, ?> kept = (Map<?, ?>) reports.get(1);
        assertEquals("Risk", kept.get("id"));
        assertEquals("classifier", kept.get("kind"));
        assertEquals("risk", kept.get("mappedTo"));
        assertEquals(CLASSIFIER.get("probabilities"), kept.get("probabilities"));
        Map<?, ?> meta = (Map<?, ?>) forest.getOutput().get("meta");
        assertEquals(String.valueOf(joblibModel.getId()), meta.get("modelId"));
        assertEquals(forest.getModelInput(), meta.get("backendFieldValues"));
        // The positional model answers both reports; its copies route by position-free feature names.
        List<?> netReports = (List<?>) results.get(1).getOutput().get("reports");
        assertEquals(4, netReports.size());
        assertEquals("score", ((Map<?, ?>) netReports.get(3)).get("mappedTo"));

        // Read back, the run has the public keys and nothing of the above naming.
        assertEquals(List.of("out0", "out1", "out2"), made.reports().stream().map(report -> report.key()).toList());
        assertEquals(List.of(CLASSIFIER, CLASSIFIER, REGRESSOR), made.reports().stream().map(report -> report.payload()).toList());
        assertEquals(Map.of("Age", 52, "Cholesterol", 240.5, "Smoker", "yes"), made.inputs());
    }

    @Test
    void aVisitorReviewsTheirOwnRunAndTheAnswerIsKeptWithoutAUser() throws Exception {
        long feedbackBefore = count("PredictionResultFeedback");
        MvcResult made = mockMvc.perform(runRequest(bookmark.getPublicId())).andReturn();
        Cookie visitor = cookie(made.getResponse().getHeader(HttpHeaders.SET_COOKIE));
        long runId = read(made).run().id();

        mockMvc.perform(feedback(runId, FEEDBACK).cookie(visitor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.feedback.length()").value(1))
                .andExpect(jsonPath("$.feedback[0].reportKey").value("out0"))
                .andExpect(jsonPath("$.feedback[0].type").value("OUTPUT"))
                .andExpect(jsonPath("$.feedback[0].value['output-feedback-assessment']").value("high"));
        // Answering again replaces the answer; an explanation is asked on the report that has a questionnaire.
        mockMvc.perform(feedback(runId, FEEDBACK.replace("\"high\"", "\"low\"")
                .replace("}]}", "},{\"reportKey\":\"out1\",\"type\":\"EXPLANATION\",\"value\":{\"q\":\"unsure\"}}]}"))
                .cookie(visitor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.feedback.length()").value(2))
                .andExpect(jsonPath("$.feedback[0].value['output-feedback-assessment']").value("low"))
                .andExpect(jsonPath("$.feedback[1].reportKey").value("out1"));
        mockMvc.perform(get("/api/public/bookmarks/{publicId}/runs", bookmark.getPublicId()).cookie(visitor))
                .andExpect(jsonPath("$[0].feedback.length()").value(2));

        List<PredictionResultFeedback> kept = entityManager
                .createQuery("select f from PredictionResultFeedback f where f.result.run.id = :run order by f.id",
                        PredictionResultFeedback.class)
                .setParameter("run", runId).getResultList();
        assertEquals(2, kept.size());
        assertNull(kept.get(0).getUser());
        assertEquals(UUID.fromString(visitor.getValue()), kept.get(0).getVisitor().getId());
        assertEquals(0, kept.get(0).getOrder());
        assertEquals(joblibModel.getId(), kept.get(0).getResult().getModel().getId());
        assertEquals(onnxModel.getId(), kept.get(1).getResult().getModel().getId());
        assertNull(PredictionResultFeedbackDto.from(kept.get(0)).userId());

        // What is not asked is refused: an unknown report, an explanation no questionnaire asks, a bare value.
        for (String body : List.of(
                FEEDBACK.replace("out0", "out9"),
                FEEDBACK.replace("out0", "out2").replace("OUTPUT", "EXPLANATION"),
                FEEDBACK.replace("{\"output-feedback-assessment\":\"high\"}", "\"high\""))) {
            mockMvc.perform(feedback(runId, body).cookie(visitor)).andExpect(status().isBadRequest());
        }
        // Another browser cannot review the run.
        mockMvc.perform(feedback(runId, FEEDBACK)).andExpect(status().isNotFound());
        assertEquals(feedbackBefore + 2, count("PredictionResultFeedback"));
    }

    @Test
    void aSignedInAccountRunsUnderItsBrowserAndIsNamedOnTheRunAndItsFeedback() throws Exception {
        MvcResult made = mockMvc.perform(signedIn(runRequest(bookmark.getPublicId()), owner.getId()))
                .andExpect(status().isOk())
                .andReturn();
        Cookie visitor = cookie(made.getResponse().getHeader(HttpHeaders.SET_COOKIE));
        long runId = read(made).run().id();
        PredictionRun run = entityManager.find(PredictionRun.class, runId);
        assertEquals(PredictionRunOrigin.PUBLIC, run.getOrigin());
        assertEquals("Owner", run.getCreatedByName());
        assertEquals(owner.getEmail(), run.getCreatedByEmail());
        assertNotNull(run.getVisitor());

        mockMvc.perform(signedIn(feedback(runId, FEEDBACK).cookie(visitor), owner.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.feedback.length()").value(1));
        PredictionResultFeedback kept = entityManager
                .createQuery("select f from PredictionResultFeedback f where f.result.run.id = :run", PredictionResultFeedback.class)
                .setParameter("run", runId).getSingleResult();
        assertEquals(owner.getId(), kept.getUser().getId());
        assertNull(kept.getVisitor());
        // Signed out in the same browser, the run is still listed but the account's answers are its own.
        mockMvc.perform(get("/api/public/bookmarks/{publicId}/runs", bookmark.getPublicId()).cookie(visitor))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].feedback.length()").value(0));
        mockMvc.perform(signedIn(get("/api/public/bookmarks/{publicId}/runs", bookmark.getPublicId()).cookie(visitor), owner.getId()))
                .andExpect(jsonPath("$[0].feedback.length()").value(1));
    }

    @Test
    void aBookmarkThatIsNoLongerPublicShowsNoSession() throws Exception {
        long runsBefore = count("PredictionRun");
        MvcResult made = mockMvc.perform(runRequest(bookmark.getPublicId())).andReturn();
        Cookie visitor = cookie(made.getResponse().getHeader(HttpHeaders.SET_COOKIE));
        inTransaction(() -> {
            SchemaBookmark unpublished = entityManager.find(SchemaBookmark.class, bookmark.getId());
            unpublished.setVisibility(BookmarkVisibility.PRIVATE);
        });
        mockMvc.perform(get("/api/public/bookmarks/{publicId}/runs", bookmark.getPublicId()).cookie(visitor))
                .andExpect(status().isNotFound());
        mockMvc.perform(feedback(read(made).run().id(), FEEDBACK).cookie(visitor))
                .andExpect(status().isNotFound());
        // The run itself stays the organization's.
        assertEquals(runsBefore + 1, count("PredictionRun"));
    }

    private MockHttpServletRequestBuilder feedback(long runId, String body) {
        return put("/api/public/bookmarks/{publicId}/runs/{runId}/feedback", bookmark.getPublicId(), runId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }

    private PublicPredictionDtoView read(MvcResult result) throws Exception {
        return objectMapper.readValue(result.getResponse().getContentAsString(), PublicPredictionDtoView.class);
    }

    /** Only what these tests read of the answer. */
    record PublicPredictionDtoView(PublicRunDto run) {
    }

    private static Cookie cookie(String setCookie) {
        String pair = setCookie.split(";", 2)[0];
        return new Cookie(pair.substring(0, pair.indexOf('=')), pair.substring(pair.indexOf('=') + 1));
    }
}
