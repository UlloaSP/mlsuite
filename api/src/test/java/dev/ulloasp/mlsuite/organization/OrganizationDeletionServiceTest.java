package dev.ulloasp.mlsuite.organization;

import static org.junit.jupiter.api.Assertions.*;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationDeletionService;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.model.*;
import dev.ulloasp.mlsuite.role.domain.model.*;
import dev.ulloasp.mlsuite.user.domain.model.*;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.web.server.ResponseStatusException;

@DataJpaTest(properties = {
    "spring.profiles.active=test", "logging.file.name=target/org-delete-test.log",
    "spring.datasource.url=jdbc:h2:mem:orgdelete;MODE=PostgreSQL;INIT=CREATE DOMAIN IF NOT EXISTS TIMESTAMPTZ AS TIMESTAMP WITH TIME ZONE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(OrganizationDeletionService.class)
@ContextConfiguration(classes = OrganizationDeletionServiceTest.PersistenceConfig.class)
class OrganizationDeletionServiceTest {
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
        var org = new Organization("qa-empty", "QA", null, null, owner);
        entityManager.persist(org);
        owner.setCurrentOrganization(org);
        var role = new RoleDefinition(org, RoleScope.ORGANIZATION, "Owner", "owner", "OWNER");
        role.getPermissions().add(PermissionKey.VIEW_MODELS);
        entityManager.persist(role);
        var membership = new OrganizationMembership(org, owner, OrganizationRole.OWNER, MembershipStatus.ACTIVE);
        membership.setRoleDefinition(role);
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
        var org = new Organization("qa-used", "QA", null, null, owner);
        entityManager.persist(org);
        var model = new Model();
        model.setName("QA model");
        model.setFileName("qa.joblib");
        model.setType("classifier");
        model.setSpecificType("DecisionTreeClassifier");
        model.setUser(owner);
        model.setOrganization(org);
        model.setModelFile(new byte[0]);
        entityManager.persist(model);
        entityManager.flush();

        var error = assertThrows(ResponseStatusException.class, () -> service.delete(org.getId()));
        assertEquals(409, error.getStatusCode().value());
        assertNotNull(entityManager.find(Organization.class, org.getId()));
        assertNotNull(entityManager.find(Model.class, model.getId()));
    }
}
