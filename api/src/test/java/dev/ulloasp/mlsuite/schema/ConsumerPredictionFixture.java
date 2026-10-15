package dev.ulloasp.mlsuite.schema;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.schema.application.dto.CreateBookmarkApiKeyRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.BookmarkApiKeyUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkApiKey;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

/**
 * A second public bookmark of the fixture's schema, on a snapshot that runs the forest alone,
 * with one API key, for the tests of runs made with a key: ConsumerPredictionTest for the runs
 * that happen, ConsumerPredictionRefusalTest for the ones that do not.
 */
abstract class ConsumerPredictionFixture extends PublicPredictionFixture {

    static final String PATH = "/api/public/model-predictions";
    static final String FEATURES = "{\"features\":{\"age\":52,\"sex__male\":1}}";
    /** The mlbundle runtime's answer: one report per model output, by output position. */
    static final Map<String, Object> ANSWER = Map.of("reports", List.of(
            Map.of("kind", "classifier", "output", 0, "execution_time", 0.01, "mapping", List.of("low", "high"),
                    "probabilities", List.of(0.2, 0.8), "prediction", "high"),
            Map.of("kind", "regressor", "output", 1, "execution_time", 0.01, "values", List.of(41.5))));

    @Autowired BookmarkApiKeyUseCase apiKeys;

    SchemaBookmark single;
    SchemaVersion singleVersion;
    String secret;

    @BeforeEach
    void issueAKeyOnASingleModelBookmark() {
        authorizeOwner();
        inTransaction(() -> {
            Schema stored = entityManager.find(Schema.class, schema.getId());
            singleVersion = new SchemaVersion(stored, 4, "Forest only", Map.of(
                    "fields", List.of(Map.of("kind", "number", "label", "Age", "mappedTo", Map.of("risk-forest", "age"))),
                    "reports", List.of(
                            Map.of("kind", "classifier", "label", "Risk", "mappedTo", Map.of("risk-forest", 0)),
                            Map.of("kind", "regressor", "label", "Score", "mappedTo", Map.of("risk-forest", 1)))));
            entityManager.persist(singleVersion);
            entityManager.persist(new SchemaModelBinding(singleVersion, forestModel, Map.of()));
            single = new SchemaBookmark(stored, singleVersion, "consumers");
            single.setVisibility(BookmarkVisibility.PUBLIC);
            single.setPublicId(UUID.randomUUID().toString());
            entityManager.persist(single);
        });
        secret = issue(single, "Lab2Pressure");
        when(analyzer.post(eq("/predict"), any())).thenReturn(ANSWER);
    }

    String issue(SchemaBookmark target, String name) {
        return apiKeys.createKey(owner.getId(), target.getId(), new CreateBookmarkApiKeyRequest(name)).secret();
    }

    static MockHttpServletRequestBuilder predicting(String key, String body) {
        return post(PATH).header("X-MLSuite-Key", key).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    /** Newest first. */
    List<PredictionRun> runsOf(SchemaBookmark target) {
        return entityManager.createQuery(
                "select r from PredictionRun r where r.schemaBookmark.id = :id order by r.id desc", PredictionRun.class)
                .setParameter("id", target.getId()).getResultList();
    }

    BookmarkApiKey keyNamed(SchemaBookmark target, String name) {
        return entityManager.createQuery(
                "select k from BookmarkApiKey k where k.bookmark.id = :id and k.name = :name", BookmarkApiKey.class)
                .setParameter("id", target.getId()).setParameter("name", name).getSingleResult();
    }
}
