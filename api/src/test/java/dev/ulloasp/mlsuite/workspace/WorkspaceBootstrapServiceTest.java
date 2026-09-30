package dev.ulloasp.mlsuite.workspace;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.support.TestFixtures;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceBootstrapService;

class WorkspaceBootstrapServiceTest {

    @Test
    void bootstrapPersistsOwnerWithItsRoleDefinition() {
        OrganizationRepository organizations = mock();
        OrganizationMembershipRepository memberships = mock();
        UserRepository users = mock();
        ModelRepository models = mock();
        RoleSeedService seeds = mock();
        WorkspaceBootstrapService bootstrap = new WorkspaceBootstrapService(
                organizations, memberships, users, models, seeds);
        User user = TestFixtures.user(7L);
        RoleDefinition ownerRole = TestFixtures.role(TestFixtures.organization(), "OWNER");
        when(memberships.findActiveByUserId(7L)).thenReturn(List.of());
        when(organizations.existsBySlug(anyString())).thenReturn(false);
        when(organizations.save(any(Organization.class))).thenAnswer(invocation -> {
            Organization saved = invocation.getArgument(0);
            saved.setId(41L);
            return saved;
        });
        when(seeds.orgRole(any(Organization.class), eq(OrganizationRole.OWNER))).thenReturn(ownerRole);
        when(models.findByUserIdAndOrganizationIdIsNull(7L)).thenReturn(List.of());

        bootstrap.ensureCurrentOrganization(user);

        ArgumentCaptor<OrganizationMembership> saved = ArgumentCaptor.forClass(OrganizationMembership.class);
        verify(memberships).save(saved.capture());
        assertSame(ownerRole, saved.getValue().getRoleDefinition());
    }
}
