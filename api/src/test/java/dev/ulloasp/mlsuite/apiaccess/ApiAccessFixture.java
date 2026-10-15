package dev.ulloasp.mlsuite.apiaccess;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiRequestRepository;
import dev.ulloasp.mlsuite.apiaccess.application.dto.CreateApiClientKeyRequest;
import dev.ulloasp.mlsuite.apiaccess.application.dto.CreateApiClientRequest;
import dev.ulloasp.mlsuite.apiaccess.application.port.in.ApiClientAccessUseCase;
import dev.ulloasp.mlsuite.apiaccess.application.port.in.ApiClientUseCase;
import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClientKey;
import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiRequest;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

/**
 * A client named Lab2Pressure with one key, given a private bookmark whose snapshot runs the
 * forest alone, for the tests of the client API and its management.
 */
abstract class ApiAccessFixture extends PublicPredictionFixture {

    static final String FEATURES = "{\"features\":{\"age\":52,\"sex__male\":1}}";
    /** The mlbundle runtime's answer: one report per model output, by output position. */
    static final Map<String, Object> ANSWER = Map.of("reports", List.of(
            Map.of("kind", "classifier", "output", 0, "execution_time", 0.01, "mapping", List.of("low", "high"),
                    "probabilities", List.of(0.2, 0.8), "prediction", "high"),
            Map.of("kind", "regressor", "output", 1, "execution_time", 0.01, "values", List.of(41.5))));

    @Autowired ApiClientUseCase clients;
    @Autowired ApiClientAccessUseCase access;
    @Autowired ApiRequestRepository requestRepository;

    SchemaBookmark single;
    SchemaVersion singleVersion;
    Long clientId;
    String secret;
    String apiId;

    @BeforeEach
    void giveAClientASingleModelBookmark() {
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
            entityManager.persist(single);
        });
        clientId = clients.createClient(owner.getId(), new CreateApiClientRequest("Lab2Pressure", null)).client().id();
        secret = issue(clientId, "Production");
        apiId = access.grantBookmark(owner.getId(), clientId, single.getId()).bookmarks().getFirst().apiId();
        when(analyzer.post(eq("/predict"), any())).thenReturn(ANSWER);
    }

    String issue(Long client, String name) {
        return access.issueKey(owner.getId(), client, new CreateApiClientKeyRequest(name)).secret();
    }

    static String path(String bookmarkId) {
        return "/api/v1/bookmarks/" + bookmarkId + "/predictions";
    }

    MockHttpServletRequestBuilder predicting(String key, String body) {
        return predicting(key, apiId, body);
    }

    static MockHttpServletRequestBuilder predicting(String key, String bookmarkId, String body) {
        return post(path(bookmarkId)).header("X-MLSuite-Key", key).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    MockHttpServletRequestBuilder member(MockHttpServletRequestBuilder request) {
        return signedIn(request, owner.getId());
    }

    /** Newest first. */
    List<PredictionRun> runsOf(SchemaBookmark target) {
        return entityManager.createQuery(
                "select r from PredictionRun r where r.schemaBookmark.id = :id order by r.id desc", PredictionRun.class)
                .setParameter("id", target.getId()).getResultList();
    }

    /** The organization's logged calls, newest first. */
    List<ApiRequest> calls() {
        return entityManager.createQuery(
                "select r from ApiRequest r where r.organizationId = :id order by r.id desc", ApiRequest.class)
                .setParameter("id", organization.getId()).getResultList();
    }

    ApiClientKey keyNamed(String name) {
        return entityManager.createQuery(
                "select k from ApiClientKey k where k.client.id = :id and k.name = :name", ApiClientKey.class)
                .setParameter("id", clientId).setParameter("name", name).getSingleResult();
    }

    /** Logs {@code count} calls of the client at {@code at}, as if it had made them. */
    void logCalls(int count, int status, OffsetDateTime at) {
        ApiClientKey key = keyNamed("Production");
        inTransaction(() -> {
            for (int i = 0; i < count; i++) {
                requestRepository.log(UUID.randomUUID(), organization.getId(), clientId, "Lab2Pressure", key.getId(),
                        key.getKeyPrefix(), single.getId(), "consumers", null, status,
                        status == 200 ? null : "features_rejected", 10, at);
            }
        });
    }

    <T> T inTransactionReturning(Supplier<T> work) {
        Object[] made = new Object[1];
        inTransaction(() -> made[0] = work.get());
        @SuppressWarnings("unchecked")
        T result = (T) made[0];
        return result;
    }
}
