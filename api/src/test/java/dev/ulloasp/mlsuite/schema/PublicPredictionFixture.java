package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import javax.sql.DataSource;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.MultiValueMap;
import org.springframework.web.server.ResponseStatusException;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.adapter.out.analyzer.AnalyzerClient;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionRequest;
import dev.ulloasp.mlsuite.schema.application.service.PublicBookmarkService;
import dev.ulloasp.mlsuite.schema.application.service.PublicPredictionService;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.storage.ArtifactHash;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import jakarta.persistence.EntityManager;

/**
 * The whole application for the public prediction tests: the real web configuration, security
 * chain and migrated PostgreSQL schema, with one published bookmark stored as rows before each
 * test. Only the runtime is a stand-in.
 */
@SpringBootTest(properties = {
        "spring.profiles.active=test",
        "logging.file.name=target/public-prediction-test.log",
        "server.port=0",
        "analyzer.url=http://runtime.invalid",
        "cors.allow-origins=http://localhost:5173",
        "storage.endpoint=http://storage.invalid",
        "storage.access-key=test",
        "storage.secret-key=test",
        "storage.bucket=test",
        "storage.auto-create-bucket=false",
        "storage.deletion.enabled=false",
        "mlsuite.public-prediction.max-model-size-mb=1",
        "mlsuite.public-prediction.max-concurrent=1"
})
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
abstract class PublicPredictionFixture {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18.6")
            .withDatabaseName("mlsuite")
            .withUsername("mlsuite")
            .withPassword("mlsuite");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.user", POSTGRES::getUsername);
        registry.add("spring.flyway.password", POSTGRES::getPassword);
    }

    private static final AtomicInteger SEQUENCE = new AtomicInteger();
    static final long MB = 1024L * 1024L;
    static final byte[] JOBLIB_BYTES = "joblib-artifact".getBytes();
    static final byte[] ONNX_BYTES = "onnx-artifact".getBytes();
    static final Map<String, Object> CLASSIFIER = Map.of("kind", "classifier", "label", "Predicted class",
            "mapping", List.of("low", "high"), "probabilities", List.of(List.of(0.2, 0.8)));
    static final Map<String, Object> REGRESSOR = Map.of("kind", "regressor", "label", "Predicted value",
            "values", List.of(41.5));

    @Autowired EntityManager entityManager;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired DataSource dataSource;
    @Autowired ObjectMapper objectMapper;
    @Autowired MockMvc mockMvc;
    @MockitoBean AnalyzerClient analyzer;
    @Autowired PublicBookmarkService publicBookmarks;
    @Autowired PublicPredictionService service;

    Organization organization;
    Schema schema;
    SchemaVersion version;
    SchemaBookmark bookmark;
    Model joblibModel;
    Model onnxModel;

    /** One published bookmark over two models: every field and report routes by model name or id. */
    @BeforeEach
    void publishABookmark() {
        reset(analyzer);
        int n = SEQUENCE.incrementAndGet();
        inTransaction(() -> {
            User owner = new User("owner" + n, "owner" + n + "@example.test", "unused", "Owner", SystemRole.USER);
            entityManager.persist(owner);
            organization = new Organization("acme-" + n, "Acme Health", null, null, owner);
            entityManager.persist(organization);
            joblibModel = model(owner, "risk-forest", "risk.joblib", JOBLIB_BYTES);
            onnxModel = model(owner, "risk-net", "risk.onnx", ONNX_BYTES);
            schema = new Schema(organization, "Cardio risk", null);
            entityManager.persist(schema);
            version = new SchemaVersion(schema, 3, "Baseline", Map.of(
                    "fields", List.of(
                            Map.of("kind", "number", "label", "Age",
                                    "mappedTo", Map.of("risk-forest", "age", "risk-net", 1)),
                            Map.of("kind", "number", "label", "Cholesterol",
                                    "mappedTo", Map.of("risk-forest", "chol", String.valueOf(onnxModel.getId()), 0)),
                            Map.of("kind", "onehot-category", "label", "Smoker", "options", List.of(
                                    Map.of("label", "Yes", "value", "yes",
                                            "mappedTo", Map.of("risk-forest", "smoker__yes")),
                                    Map.of("label", "No", "value", "no",
                                            "mappedTo", Map.of("risk-forest", "smoker__no"))))),
                    "reports", List.of(
                            Map.of("kind", "classifier", "label", "Risk", "source", "editor",
                                    "feedbackQuestionnaire", Map.of("steps", List.of()),
                                    "mappedTo", Map.of("risk-forest", "risk", "risk-net", "risk")),
                            Map.of("kind", "regressor", "label", "Score",
                                    "mappedTo", Map.of("risk-net", "score")))));
            entityManager.persist(version);
            entityManager.persist(new SchemaModelBinding(version, joblibModel, Map.of()));
            entityManager.persist(new SchemaModelBinding(version, onnxModel, Map.of()));
            bookmark = new SchemaBookmark(schema, version, "production");
            bookmark.setVisibility(BookmarkVisibility.PUBLIC);
            bookmark.setPublicId("public-" + n);
            entityManager.persist(bookmark);
        });
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> Map.of("reports",
                fileName(call.getArgument(1)).endsWith(".onnx") ? List.of(CLASSIFIER, REGRESSOR) : List.of(CLASSIFIER)));
    }

    private Model model(User owner, String name, String fileName, byte[] bytes) {
        Model model = new Model(owner, name, "classifier", "Estimator", fileName, bytes);
        model.setOrganization(organization);
        model.setModelSizeBytes((long) bytes.length);
        model.setArtifactSha256(ArtifactHash.sha256(bytes));
        entityManager.persist(model);
        return model;
    }

    PublicPredictionRequest request(Map<String, Object> values) {
        return new PublicPredictionRequest(version.getVersion(), values);
    }

    ResponseStatusException refused(String publicId, PublicPredictionRequest request) {
        return assertThrows(ResponseStatusException.class, () -> service.run(publicId, request));
    }

    void inTransaction(Runnable work) {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> work.run());
    }

    long count(String entity) {
        return entityManager.createQuery("select count(x) from " + entity + " x", Long.class).getSingleResult();
    }

    static String fileName(MultiValueMap<String, HttpEntity<?>> parts) {
        return parts.getFirst("model_file").getHeaders().getContentDisposition().getFilename();
    }

    static String data(MultiValueMap<String, HttpEntity<?>> parts) {
        return (String) parts.getFirst("data").getBody();
    }
}
