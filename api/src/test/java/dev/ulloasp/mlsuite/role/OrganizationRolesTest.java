package dev.ulloasp.mlsuite.role;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import dev.ulloasp.mlsuite.organization.application.dto.CreateOrganizationRequest;
import dev.ulloasp.mlsuite.organization.application.port.in.OrganizationManagementUseCase;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.PersonalAccountService;

/**
 * Every organization has its roles from the moment it exists: each system role with its whole
 * permission set, and an editable Reviewer role. Nothing adds them later.
 */
class OrganizationRolesTest extends PublicPredictionFixture {

    private static final Map<String, Set<PermissionKey>> SYSTEM_ROLES = Map.of(
            "OWNER", EnumSet.allOf(PermissionKey.class),
            "ADMIN", EnumSet.complementOf(EnumSet.of(PermissionKey.DELETE_ORGANIZATION,
                    PermissionKey.TRANSFER_OWNERSHIP)),
            "MEMBER", EnumSet.of(PermissionKey.VIEW_WORKSPACE, PermissionKey.VIEW_ORGANIZATION,
                    PermissionKey.VIEW_MODELS, PermissionKey.CREATE_MODELS, PermissionKey.EDIT_MODELS,
                    PermissionKey.DELETE_MODELS, PermissionKey.RUN_PREDICTIONS, PermissionKey.VIEW_PLUGINS),
            "VIEWER", EnumSet.of(PermissionKey.VIEW_WORKSPACE, PermissionKey.VIEW_ORGANIZATION,
                    PermissionKey.VIEW_MODELS, PermissionKey.VIEW_PLUGINS),
            "REVIEWER", EnumSet.of(PermissionKey.REVIEW));

    @Autowired OrganizationManagementUseCase organizations;
    @Autowired PersonalAccountService personalAccounts;
    @Autowired RoleDefinitionRepository roles;

    @Test
    void aNewOrganizationHasEverySystemRoleWithItsPermissions() {
        authorizeOwner();
        Long id = organizations.createOrganization(owner.getId(),
                new CreateOrganizationRequest("Globex", null, null, null)).id();

        assertRoles(id);
    }

    @Test
    void aNewPersonalAccountHasThemToo() {
        User person = new User("person-" + System.nanoTime(), "person@example.test", "unused", "Person",
                SystemRole.USER);
        inTransaction(() -> {
            entityManager.persist(person);
            personalAccounts.open(person);
        });
        Long id = entityManager.createQuery(
                "select o.id from Organization o where o.createdBy.id = :user", Long.class)
                .setParameter("user", person.getId()).getSingleResult();

        assertRoles(id);
    }

    private void assertRoles(Long organizationId) {
        Map<String, RoleDefinition> byKey = roles.findByOrganizationId(organizationId).stream()
                .collect(Collectors.toMap(RoleDefinition::getSystemKey, role -> role));
        assertEquals(SYSTEM_ROLES.keySet(), byKey.keySet());
        SYSTEM_ROLES.forEach((key, permissions) -> assertEquals(permissions, byKey.get(key).getPermissions(), key));
        assertEquals(false, byKey.get("REVIEWER").isLocked());
    }
}
