package dev.ulloasp.mlsuite.admin;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import dev.ulloasp.mlsuite.organization.domain.model.*;
import dev.ulloasp.mlsuite.user.domain.model.*;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceBootstrapService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.*;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@DataJpaTest(properties = {
    "spring.profiles.active=test", "logging.file.name=target/user-delete-test.log",
    "spring.datasource.url=jdbc:h2:mem:userdelete;MODE=PostgreSQL;INIT=CREATE DOMAIN IF NOT EXISTS TIMESTAMPTZ AS TIMESTAMP WITH TIME ZONE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(AdminUserService.class)
@ContextConfiguration(classes = AdminUserDeletionTest.PersistenceConfig.class)
class AdminUserDeletionTest {
    @Configuration
    @EntityScan("dev.ulloasp.mlsuite")
    @EnableJpaRepositories("dev.ulloasp.mlsuite")
    static class PersistenceConfig {
        @Bean PasswordEncoder passwordEncoder() { return mock(PasswordEncoder.class); }
        @Bean WorkspaceBootstrapService bootstrapService() { return mock(WorkspaceBootstrapService.class); }
    }
    @Autowired EntityManager entityManager;
    @Autowired AdminUserService service;

    @Test
    void deletesUnreferencedUser() {
        var target = user(SystemRole.USER);
        Long id = target.getId();
        service.delete(id);
        entityManager.clear();
        assertNull(entityManager.find(User.class, id));
    }

    @Test
    void personalOrganizationReturnsConflictInsteadOfUnexpectedError() {
        var target = user(SystemRole.USER);
        var org = new Organization("qa-personal", "QA", null, null, target);
        entityManager.persist(org);
        target.setCurrentOrganization(org);
        entityManager.persist(new OrganizationMembership(org, target, OrganizationRole.OWNER, MembershipStatus.ACTIVE));
        entityManager.flush();
        var error = assertThrows(ResponseStatusException.class, () -> service.delete(target.getId()));
        assertEquals(409, error.getStatusCode().value());
        assertTrue(error.getReason().contains("protected records"));
    }

    @Test
    void missingUserIsNotFound() {
        assertThrows(UserDoesNotExistException.class, () -> service.delete(999999L));
    }

    @Test
    void lastEnabledSuperadminIsPreserved() {
        var target = user(SystemRole.SUPERADMIN);
        assertThrows(IllegalArgumentException.class, () -> service.delete(target.getId()));
        assertNotNull(entityManager.find(User.class, target.getId()));
    }

    private User user(SystemRole role) {
        var target = new User("qa", "qa@example.test", "unused", "QA", role);
        entityManager.persist(target);
        entityManager.flush();
        return target;
    }
}
