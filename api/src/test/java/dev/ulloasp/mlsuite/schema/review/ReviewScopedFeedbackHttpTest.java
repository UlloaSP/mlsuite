package dev.ulloasp.mlsuite.schema.review;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewAssignee;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRun;

/**
 * A reviewer's answers belong to the review they were given in: one run under two reviews gets
 * two answers, removing the response to one review leaves the other, and every change is kept in
 * the result's answer history, including what was removed and by whom.
 */
class ReviewScopedFeedbackHttpTest extends PublicPredictionFixture {

    private PredictionResult result;
    private final List<SchemaReview> reviews = new ArrayList<>();
    private final List<SchemaReviewRun> reviewRuns = new ArrayList<>();

    /** The owner reviews one run in two reviews and manages both. */
    @BeforeEach
    void oneRunUnderTwoReviews() {
        authorizeOwner();
        inTransaction(() -> {
            PredictionRun run = new PredictionRun(bookmark, version, "reviewed-" + System.nanoTime(),
                    Map.of("Age", 52), PredictionRunStatus.SUCCESS);
            entityManager.persist(run);
            result = new PredictionResult(run, forestModel, Map.of("age", 52), Map.of("reports", List.of()),
                    PredictionResultStatus.SUCCESS, null, null);
            entityManager.persist(result);
            for (int i = 0; i < 2; i++) {
                SchemaReview review = new SchemaReview(organization, schema, version, owner,
                        OffsetDateTime.now().plusDays(7));
                entityManager.persist(review);
                entityManager.persist(new SchemaReviewAssignee(review, owner));
                SchemaReviewRun reviewRun = new SchemaReviewRun(review, run);
                entityManager.persist(reviewRun);
                reviews.add(review);
                reviewRuns.add(reviewRun);
            }
        });
    }

    @Test
    void eachReviewKeepsItsOwnAnswerAndRemovingOneResponseLeavesTheOther() throws Exception {
        long first = answer(0, "high");
        long second = answer(1, "low");
        assertEquals(2, answers().size());

        mockMvc.perform(signedIn(delete("/api/schema-reviews/{review}/runs/{run}/reviewers/{reviewer}/response",
                reviews.get(0).getPublicId(), reviewRuns.get(0).getPublicId(), owner.getId()), owner.getId()))
                .andExpect(status().isNoContent());

        List<PredictionResultFeedback> left = answers();
        assertEquals(1, left.size());
        assertEquals(second, left.get(0).getId());
        assertEquals("low", left.get(0).getValue().get("output-feedback-assessment").asText());
        // The removed answer is not gone from the record.
        JsonNode history = history();
        assertEquals(List.of("CREATED", "CREATED", "DELETED"), changes(history));
        assertEquals(first, history.get(2).get("feedbackId").asLong());
        assertEquals(owner.getId(), history.get(2).get("changedByUserId").asLong());
        assertEquals(reviews.get(0).getId(), history.get(2).get("reviewId").asLong());
        // Who answered, who removed it and in which review, named as people tell them apart.
        assertEquals(owner.getFullName(), history.get(2).get("userName").asText());
        assertEquals(owner.getFullName(), history.get(2).get("changedByName").asText());
        assertEquals(reviews.get(0).getPublicId(), history.get(2).at("/review/publicId").asText());
        assertEquals(reviews.get(1).getPublicId(), history.get(1).at("/review/publicId").asText());
        assertEquals(owner.getFullName(), history.get(2).at("/review/createdByName").asText());
    }

    @Test
    void aChangedAnswerKeepsWhatItSaidBefore() throws Exception {
        long id = answer(0, "high");

        mockMvc.perform(signedIn(patch("/api/schema-reviews/{review}/runs/{run}/feedback",
                reviews.get(0).getPublicId(), reviewRuns.get(0).getPublicId()), owner.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("feedbackId", id,
                        "value", Map.of("output-feedback-assessment", "low")))))
                .andExpect(status().isOk());

        JsonNode history = history();
        assertEquals(List.of("CREATED", "UPDATED"), changes(history));
        assertEquals("high", history.get(0).at("/value/output-feedback-assessment").asText());
        assertEquals("low", history.get(1).at("/value/output-feedback-assessment").asText());
    }

    @Test
    void anAnswerGivenInOneReviewIsNotChangedThroughAnother() throws Exception {
        long id = answer(0, "high");

        mockMvc.perform(signedIn(patch("/api/schema-reviews/{review}/runs/{run}/feedback",
                reviews.get(1).getPublicId(), reviewRuns.get(1).getPublicId()), owner.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("feedbackId", id,
                        "value", Map.of("output-feedback-assessment", "low")))))
                .andExpect(status().isForbidden());

        assertEquals(List.of("CREATED"), changes(history()));
    }

    @Test
    void theHistoryOfAResultOutsideTheOrganizationIsNotFound() throws Exception {
        mockMvc.perform(signedIn(get("/api/prediction-result-feedback/history").param("resultId", "9999999"),
                owner.getId())).andExpect(status().isNotFound());
    }

    private long answer(int review, String assessment) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("resultId", result.getId(), "type", "OUTPUT",
                "order", 0, "value", Map.of("output-feedback-assessment", assessment)));
        String answered = mockMvc.perform(signedIn(post("/api/schema-reviews/{review}/runs/{run}/feedback",
                reviews.get(review).getPublicId(), reviewRuns.get(review).getPublicId()), owner.getId())
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is2xxSuccessful())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(answered).get("id").asLong();
    }

    private List<PredictionResultFeedback> answers() {
        entityManager.clear();
        return entityManager.createQuery("select f from PredictionResultFeedback f where f.result.id = :result "
                + "order by f.id", PredictionResultFeedback.class).setParameter("result", result.getId()).getResultList();
    }

    private JsonNode history() throws Exception {
        return objectMapper.readTree(mockMvc.perform(signedIn(get("/api/prediction-result-feedback/history")
                .param("resultId", String.valueOf(result.getId())), owner.getId()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private static List<String> changes(JsonNode history) {
        List<String> changes = new ArrayList<>();
        history.forEach(revision -> changes.add(revision.get("change").asText()));
        return changes;
    }
}
