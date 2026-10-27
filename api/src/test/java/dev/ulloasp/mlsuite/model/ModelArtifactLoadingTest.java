package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import jakarta.persistence.EntityManagerFactory;

/**
 * The inline copy of an artifact (model.model_file) is read only when asked for: catalog reads,
 * runs and the results that name their model leave it in the database.
 */
class ModelArtifactLoadingTest extends PublicPredictionFixture {

    @Autowired ModelRepository models;
    @Autowired EntityManagerFactory entityManagerFactory;

    @Test
    void catalogReadsDoNotSelectTheArtifact() throws Exception {
        authorizeOwner();
        Long id = forestModel.getId();

        List<String> sql = RecordedSql.during(() -> {
            mockMvc.perform(signedIn(get("/api/models"), owner.getId()))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(2));
            mockMvc.perform(signedIn(get("/api/models").param("search", "forest"), owner.getId()))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1));
            mockMvc.perform(signedIn(get("/api/models/all"), owner.getId()))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
            mockMvc.perform(signedIn(get("/api/models/{id}", id), owner.getId())).andExpect(status().isOk());
            mockMvc.perform(signedIn(get("/api/models/{id}/details", id), owner.getId())).andExpect(status().isOk());
        });

        assertTrue(sql.stream().anyMatch(statement -> statement.contains(" from model ")), String.join("\n", sql));
        assertNoArtifactRead(sql);
    }

    @Test
    void aRunAndTheResultsItKeepsDoNotSelectTheArtifact() throws Exception {
        List<String> sql = RecordedSql.during(() -> run(bookmark.getPublicId(), request(Map.of("in0", 52))));

        assertTrue(sql.stream().anyMatch(statement -> statement.contains("insert into prediction_result")),
                String.join("\n", sql));
        assertNoArtifactRead(sql);
        inTransaction(() -> {
            var results = entityManager.createQuery("select r from PredictionResult r where r.model.id = :id",
                    dev.ulloasp.mlsuite.schema.domain.model.PredictionResult.class)
                    .setParameter("id", forestModel.getId()).getResultList();
            assertFalse(results.isEmpty());
            assertFalse(entityManagerFactory.getPersistenceUnitUtil().isLoaded(results.get(0).getModel(), "modelFile"));
        });
    }

    @Test
    void theArtifactIsReadWhenAskedFor() throws Exception {
        inTransaction(() -> {
            Model model = models.findById(forestModel.getId()).orElseThrow();
            assertFalse(entityManagerFactory.getPersistenceUnitUtil().isLoaded(model, "modelFile"));
            assertArrayEquals(FOREST_BYTES, model.getModelFile());
        });
        assertArrayEquals(FOREST_BYTES, models.findModelFile(forestModel.getId()).orElseThrow());
    }

    private static void assertNoArtifactRead(List<String> sql) {
        assertFalse(sql.stream().anyMatch(statement -> statement.contains("model_file")), String.join("\n", sql));
    }
}
