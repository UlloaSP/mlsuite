package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/**
 * Writes a saved run no longer takes: feedback is written only as a reviewer's answers in a
 * review (SchemaReviewFeedbackTest), and a published snapshot keeps the bindings it was
 * published with. Both routes answer that they take no such request, and nothing changes.
 */
class RetiredWriteRoutesHttpTest extends PublicPredictionFixture {

    @BeforeEach
    void signInTheOwner() {
        authorizeOwner();
    }

    @Test
    void feedbackIsNotWrittenOutsideAReview() throws Exception {
        String body = "{\"resultId\":1,\"feedbackId\":1,\"type\":\"OUTPUT\",\"order\":0,\"value\":{}}";
        long feedback = count("PredictionResultFeedback");

        mockMvc.perform(signedIn(post("/api/prediction-result-feedback").contentType(MediaType.APPLICATION_JSON)
                .content(body), owner.getId())).andExpect(status().isMethodNotAllowed());
        mockMvc.perform(signedIn(patch("/api/prediction-result-feedback").contentType(MediaType.APPLICATION_JSON)
                .content(body), owner.getId())).andExpect(status().isMethodNotAllowed());

        assertEquals(feedback, count("PredictionResultFeedback"));
    }

    @Test
    void aPublishedSnapshotTakesNoNewBinding() throws Exception {
        long bindings = count("SchemaModelBinding");

        mockMvc.perform(signedIn(post("/api/schema-versions/{id}/bindings", version.getId())
                .contentType(MediaType.APPLICATION_JSON).content("{\"modelId\":" + forestModel.getId() + "}"),
                owner.getId())).andExpect(status().isMethodNotAllowed());

        assertEquals(bindings, count("SchemaModelBinding"));
    }
}
