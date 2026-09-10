package dev.ulloasp.mlsuite.schema;

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
import dev.ulloasp.mlsuite.user.domain.model.*;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.*;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspacePermissionsDto;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.*;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.web.server.ResponseStatusException;

@DataJpaTest(properties = {
    "spring.profiles.active=test", "logging.file.name=target/schema-delete-test.log",
    "spring.datasource.url=jdbc:h2:mem:schemadelete;MODE=PostgreSQL;INIT=CREATE DOMAIN IF NOT EXISTS TIMESTAMPTZ AS TIMESTAMP WITH TIME ZONE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(SchemaServiceImpl.class)
@ContextConfiguration(classes = SchemaDeletionServiceTest.PersistenceConfig.class)
class SchemaDeletionServiceTest {
    @Configuration
    @EntityScan("dev.ulloasp.mlsuite")
    @EnableJpaRepositories("dev.ulloasp.mlsuite")
    static class PersistenceConfig {
        @Bean UserLookupService users() { return mock(UserLookupService.class); }
        @Bean WorkspaceAccessService access() { return mock(WorkspaceAccessService.class); }
        @Bean WorkspaceAuthorizationService authorization() { return mock(WorkspaceAuthorizationService.class); }
    }
    @Autowired EntityManager entityManager;
    @Autowired SchemaServiceImpl service;
    @Autowired UserLookupService users;
    @Autowired WorkspaceAccessService access;
    @Autowired WorkspaceAuthorizationService authorization;
    private WorkspacePermissionsDto permissions;
    private User owner;
    private Organization org;
    private Schema schema;
    private SchemaVersion version;

    @BeforeEach
    void setUp() {
        reset(users, access, authorization);
        owner = new User("qa", "qa@example.test", "unused", "QA", SystemRole.USER);
        entityManager.persist(owner);
        org = new Organization("qa-schema", "QA", null, null, owner);
        entityManager.persist(org);
        schema = new Schema(org, "QA", null);
        entityManager.persist(schema);
        version = new SchemaVersion(schema, 1, "v1", Map.of());
        entityManager.persist(version);
        permissions = mock(WorkspacePermissionsDto.class);
        when(permissions.canDeleteModels()).thenReturn(true);
        when(users.requireById(owner.getId())).thenReturn(owner);
        when(access.requireCurrentOrganization(owner.getId())).thenReturn(org);
        when(authorization.workspacePermissions(owner.getId(), org.getId())).thenReturn(permissions);
    }

    @Test
    void deletesSchemaWithDraftBookmarkAndBindingButKeepsModel() {
        var model = new Model();
        model.setName("QA model"); model.setFileName("qa.joblib");
        model.setType("classifier"); model.setSpecificType("DecisionTreeClassifier");
        model.setUser(owner); model.setOrganization(org); model.setModelFile(new byte[0]);
        entityManager.persist(model);
        entityManager.persist(new SchemaModelBinding(version, model, Map.of()));
        entityManager.persist(new SchemaBookmark(schema, version, "QA bookmark"));
        var draft = new SchemaDraft(schema, version, "QA draft", Map.of(), List.of());
        draft.setPublishedVersion(version);
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
        entityManager.persist(new PredictionRun(version, "QA", Map.of(), PredictionRunStatus.SUCCESS));
        assertConflict();
    }

    @Test
    void reviewProtectsSchema() {
        entityManager.persist(new SchemaReview(org, schema, version, owner, OffsetDateTime.now().plusDays(1)));
        assertConflict();
    }

    @Test
    void missingOrForeignSchemaIsNotFound() {
        var error = assertThrows(ResponseStatusException.class, () -> service.deleteSchema(owner.getId(), 999999L));
        assertEquals(404, error.getStatusCode().value());
    }

    @Test
    void missingDeletePermissionPreservesSchema() {
        when(permissions.canDeleteModels()).thenReturn(false);
        assertThrows(OrganizationAccessDeniedException.class, () -> service.deleteSchema(owner.getId(), schema.getId()));
        assertNotNull(entityManager.find(Schema.class, schema.getId()));
    }

    private void assertConflict() {
        var error = assertThrows(ResponseStatusException.class, () -> service.deleteSchema(owner.getId(), schema.getId()));
        assertEquals(409, error.getStatusCode().value());
        assertNotNull(entityManager.find(Schema.class, schema.getId()));
    }
}
