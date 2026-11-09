package dev.ulloasp.mlsuite.schema;

import dev.ulloasp.mlsuite.plugin.application.port.in.SnapshotPluginsUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraftStatus;
import dev.ulloasp.mlsuite.util.ConstraintConflicts;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import dev.ulloasp.mlsuite.support.PostgresDatabase;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.List;
import java.util.Map;
import java.time.OffsetDateTime;
import dev.ulloasp.mlsuite.schema.application.service.SchemaServiceImpl;
import dev.ulloasp.mlsuite.schema.domain.model.*;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.support.TestFixtures;
import dev.ulloasp.mlsuite.user.domain.model.*;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.*;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.principal.application.service.Principals;

@DataJpaTest(properties = {
    "spring.profiles.active=test", "logging.file.name=target/schema-delete-test.log"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({ SchemaServiceImpl.class, Principals.class })
@ContextConfiguration(classes = SchemaDeletionServiceTest.PersistenceConfig.class)
class SchemaDeletionServiceTest {

    @Autowired
    private Principals principals;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        PostgresDatabase.registerRolledBack(registry);
    }

    @MockitoBean AuditLogService auditLog;
    @MockitoBean SnapshotPluginsUseCase snapshotPlugins;
    @Configuration
    @EntityScan("dev.ulloasp.mlsuite")
    @EnableJpaRepositories("dev.ulloasp.mlsuite")
    static class PersistenceConfig {
        @Bean UserLookupService users() { return mock(UserLookupService.class); }
        @Bean WorkspaceAuthorizationService authorization() { return mock(WorkspaceAuthorizationService.class); }
    }
    @Autowired EntityManager entityManager;
    @Autowired SchemaServiceImpl service;
    @Autowired UserLookupService users;
    @Autowired WorkspaceAuthorizationService authorization;
    private User owner;
    private Organization org;
    private Schema schema;
    private SchemaVersion version;

    @BeforeEach
    void setUp() {
        reset(users, authorization);
        owner = new User("qa", "qa@example.test", "unused", "QA", SystemRole.USER);
        entityManager.persist(owner);
        org = new Organization("qa-schema", "QA", null, principals.of(owner));
        entityManager.persist(org);
        schema = new Schema(org, "QA", null, principals.system());
        entityManager.persist(schema);
        version = new SchemaVersion(schema, 1, "v1", Map.of(), principals.system());
        entityManager.persist(version);
        when(users.requireById(owner.getId())).thenReturn(owner);
        when(authorization.requireCurrent(eq(owner.getId()), any(PermissionKey[].class))).thenReturn(org);
    }

    @Test
    void deletesSchemaWithDraftBookmarkAndBindingButKeepsModel() {
        Model model = bindModel();
        entityManager.persist(new SchemaBookmark(schema, version, "QA bookmark", principals.system()));
        var draft = new SchemaDraft(schema, version, "QA draft", Map.of(), List.of(), principals.system());
        draft.setPublishedVersion(version);
        draft.setStatus(SchemaDraftStatus.PUBLISHED);
        entityManager.persist(draft);
        entityManager.flush();
        Long schemaId = schema.getId();
        service.deleteSchema(owner.getId(), schemaId);
        entityManager.flush(); entityManager.clear();
        assertNull(entityManager.find(Schema.class, schemaId));
        for (String type : List.of("SchemaDraft", "SchemaBookmark", "SchemaModelBinding", "SchemaVersion")) {
            assertEquals(0L, entityManager.createQuery("select count(x) from " + type + " x", Long.class).getSingleResult());
        }
        assertEquals(1L, entityManager.createQuery("select count(m) from Model m where m.id = :id", Long.class)
                .setParameter("id", model.getId()).getSingleResult());
    }

    @Test
    void predictionRunProtectsSchema() {
        // A snapshot always binds a model, and its bindings stay while runs were made on it.
        bindModel();
        entityManager.persist(new PredictionRun(version, "QA", Map.of(), PredictionRunStatus.SUCCESS, principals.system()));
        // Written and forgotten, as a request leaves it: only the database still knows it needs the schema.
        entityManager.flush();
        entityManager.clear();
        assertKeptBy("ck_schema_binding_fixed");
    }

    @Test
    void reviewProtectsSchema() {
        entityManager.persist(new SchemaReview(org, schema, version, principals.of(owner), OffsetDateTime.now().plusDays(1)));
        // Written and forgotten, as a request leaves it: only the database still knows it needs the schema.
        entityManager.flush();
        entityManager.clear();
        assertKeptBy("fk_schema_review_version");
    }

    @Test
    void missingOrForeignSchemaIsNotFound() {
        var error = assertThrows(ResponseStatusException.class, () -> service.deleteSchema(owner.getId(), 999999L));
        assertEquals(404, error.getStatusCode().value());
    }

    @Test
    void missingDeletePermissionPreservesSchema() {
        when(authorization.requireCurrent(owner.getId(), PermissionKey.DELETE_MODELS))
                .thenThrow(new OrganizationAccessDeniedException(org.getId()));
        assertThrows(OrganizationAccessDeniedException.class, () -> service.deleteSchema(owner.getId(), schema.getId()));
        assertNotNull(entityManager.find(Schema.class, schema.getId()));
    }

    /** The database keeps the schema: the delete is refused by the constraint of what still needs it. */
    private void assertKeptBy(String constraint) {
        var error = assertThrows(RuntimeException.class, () -> {
            service.deleteSchema(owner.getId(), schema.getId());
            entityManager.flush();
        });
        Throwable cause = error;
        while (cause != null && !(cause instanceof ConstraintViolationException)) {
            cause = cause.getCause();
        }
        assertNotNull(cause, () -> "not a constraint violation: " + error);
        assertEquals(constraint, ((ConstraintViolationException) cause).getConstraintName());
        // The person deleting is told why, not given the generic conflict.
        var conflict = ConstraintConflicts.of(new DataIntegrityViolationException("refused", cause)).orElseThrow();
        assertEquals(HttpStatus.CONFLICT, conflict.status());
    }

    private Model bindModel() {
        var model = new Model();
        model.setName("QA model"); model.setFileName("qa.mlbundle");
        model.setType("classifier"); model.setSpecificType("DecisionTreeClassifier");
        model.setCreatedBy(principals.of(owner)); model.setUpdatedBy(model.getCreatedBy()); model.setOrganization(org);
        entityManager.persist(TestFixtures.storedArtifact(model, new byte[] { 1 }));
        entityManager.persist(new SchemaModelBinding(version, model, Map.of()));
        return model;
    }
}
