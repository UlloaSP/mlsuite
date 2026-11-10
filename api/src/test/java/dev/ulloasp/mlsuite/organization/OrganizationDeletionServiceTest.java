package dev.ulloasp.mlsuite.organization;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import dev.ulloasp.mlsuite.support.PostgresDatabase;
import static org.junit.jupiter.api.Assertions.*;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationDeletionService;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.model.*;
import dev.ulloasp.mlsuite.role.domain.model.*;
import dev.ulloasp.mlsuite.support.TestFixtures;
import dev.ulloasp.mlsuite.user.domain.model.*;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.principal.application.service.Principals;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.web.server.ResponseStatusException;

@DataJpaTest(properties = {
    "spring.profiles.active=test", "logging.file.name=target/org-delete-test.log"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({ OrganizationDeletionService.class, Principals.class })
@ContextConfiguration(classes = OrganizationDeletionServiceTest.PersistenceConfig.class)
class OrganizationDeletionServiceTest {

    @Autowired
    private Principals principals;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        PostgresDatabase.registerRolledBack(registry);
    }
    @Configuration
    @EntityScan("dev.ulloasp.mlsuite")
    @EnableJpaRepositories("dev.ulloasp.mlsuite")
    static class PersistenceConfig {}

    @Autowired EntityManager entityManager;
    @Autowired OrganizationDeletionService service;

    @Test
    void deletesEmptyCurrentOrganizationWithManagedOwnerAndRole() {
        var owner = new User("qa", "qa@example.test", "unused", "QA", SystemRole.USER);
        entityManager.persist(owner);
        var org = new Organization("qa-empty", "QA", null, principals.of(owner));
        entityManager.persist(org);
        owner.setCurrentOrganization(org);
        var role = new RoleDefinition(org, "Owner", "owner", "OWNER", principals.system());
        role.getPermissions().add(PermissionKey.VIEW_MODELS);
        entityManager.persist(role);
        var membership = new OrganizationMembership(org, owner, role, MembershipStatus.ACTIVE, principals.of(owner));
        entityManager.persist(membership);
        entityManager.flush();
        Long orgId = org.getId();
        Long ownerId = owner.getId();

        service.delete(orgId);
        entityManager.flush();
        entityManager.clear();

        assertNull(entityManager.find(Organization.class, orgId));
        assertNull(entityManager.find(User.class, ownerId).getCurrentOrganization());
        assertEquals(0L, entityManager.createQuery("select count(m) from OrganizationMembership m", Long.class).getSingleResult());
        assertEquals(0L, entityManager.createQuery("select count(r) from RoleDefinition r", Long.class).getSingleResult());
    }

    @Test
    void nonexistentOrganizationIsNotFound() {
        assertThrows(OrganizationNotFoundException.class, () -> service.delete(999999L));
    }

    @Test
    void organizationWithModelIsPreserved() {
        var owner = new User("qa", "qa@example.test", "unused", "QA", SystemRole.USER);
        entityManager.persist(owner);
        var org = new Organization("qa-used", "QA", null, principals.of(owner));
        entityManager.persist(org);
        var model = new Model();
        model.setName("QA model");
        model.setFileName("qa.mlbundle");
        model.setType("classifier");
        model.setSpecificType("DecisionTreeClassifier");
        model.setCreatedBy(principals.of(owner));
        model.setUpdatedBy(model.getCreatedBy());
        model.setOrganization(org);
        entityManager.persist(TestFixtures.storedArtifact(model, new byte[] { 1 }));
        entityManager.flush();

        var error = assertThrows(ResponseStatusException.class, () -> service.delete(org.getId()));
        assertEquals(409, error.getStatusCode().value());
        assertNotNull(entityManager.find(Organization.class, org.getId()));
        assertNotNull(entityManager.find(Model.class, model.getId()));
    }
}
