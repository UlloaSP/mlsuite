package dev.ulloasp.mlsuite.organization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.invitation.application.usecase.InvitationManagementService;
import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceBootstrapService;

class ActiveMembershipRuleTest {

    @Test
    void accessRequiresRepositoryConfirmedActiveMembership() {
        User user = user(7L);
        Organization organization = organization(41L);
        OrganizationMembership membership = membership(organization, user, MembershipStatus.ACTIVE);
        UserLookupService users = mock();
        WorkspaceBootstrapService bootstrap = mock();
        OrganizationRepository organizations = mock();
        OrganizationMembershipRepository memberships = mock();
        WorkspaceAccessService access = new WorkspaceAccessService(users, bootstrap, organizations, memberships);
        when(users.requireById(7L)).thenReturn(user);
        when(bootstrap.ensureCurrentOrganization(user)).thenReturn(organization);
        when(organizations.findById(41L)).thenReturn(Optional.of(organization));
        when(memberships.findActiveByOrganizationIdAndUserId(41L, 7L)).thenReturn(Optional.of(membership));

        assertSame(membership, access.requireMembership(7L, 41L));

        when(memberships.findActiveByOrganizationIdAndUserId(41L, 7L)).thenReturn(Optional.empty());
        assertThrows(OrganizationAccessDeniedException.class, () -> access.requireMembership(7L, 41L));
    }

    @Test
    void bootstrapReplacesStaleCurrentOrganizationWithAnActiveOne() {
        User user = user(7L);
        user.setCurrentOrganization(organization(40L));
        Organization activeOrganization = organization(41L);
        OrganizationMembership active = membership(activeOrganization, user, MembershipStatus.ACTIVE);
        OrganizationRepository organizations = mock();
        OrganizationMembershipRepository memberships = mock();
        UserRepository users = mock();
        ModelRepository models = mock();
        WorkspaceBootstrapService bootstrap = new WorkspaceBootstrapService(
                organizations, memberships, users, models, mock(RoleSeedService.class));
        when(memberships.findActiveByUserId(7L)).thenReturn(List.of(active));
        when(models.findByUserIdAndOrganizationIdIsNull(7L)).thenReturn(List.of());

        assertSame(activeOrganization, bootstrap.ensureCurrentOrganization(user));
        assertSame(activeOrganization, user.getCurrentOrganization());
        verify(users).save(user);
    }

    @ParameterizedTest
    @EnumSource(value = MembershipStatus.class, names = { "PENDING", "REMOVED" })
    void acceptingInvitationActivatesInactiveMembershipWithInvitedRole(MembershipStatus inactiveStatus) {
        User user = user(7L);
        Organization organization = organization(41L);
        RoleDefinition viewer = new RoleDefinition(
                organization, RoleScope.ORGANIZATION, "Viewer", "viewer", "VIEWER");
        Invitation invitation = new Invitation(
                organization,
                user.getEmail(),
                OrganizationRole.VIEWER,
                viewer,
                "token",
                user(8L),
                OffsetDateTime.now().plusDays(1));
        OrganizationMembership inactive = membership(organization, user, inactiveStatus);
        inactive.setId(9L);
        inactive.setRole(OrganizationRole.MEMBER);
        InvitationRepository invitations = mock();
        OrganizationMembershipRepository memberships = mock();
        UserLookupService users = mock();
        RoleSeedService roles = mock();
        InvitationManagementService service = new InvitationManagementService(
                mock(WorkspaceAccessService.class),
                invitations,
                memberships,
                mock(OrganizationRepository.class),
                users,
                mock(WorkspaceAuthorizationService.class),
                mock(AuditLogService.class),
                roles,
                mock(RoleDefinitionRepository.class),
                mock(UserRepository.class));
        when(users.requireById(7L)).thenReturn(user);
        when(invitations.findByToken("token")).thenReturn(Optional.of(invitation));
        when(memberships.findByOrganizationIdAndUserId(41L, 7L)).thenReturn(Optional.of(inactive));

        service.acceptInvitation(7L, "token");

        assertEquals(MembershipStatus.ACTIVE, inactive.getStatus());
        assertEquals(OrganizationRole.VIEWER, inactive.getRole());
        assertSame(viewer, inactive.getRoleDefinition());
        assertSame(organization, user.getCurrentOrganization());
        assertEquals(InvitationStatus.ACCEPTED, invitation.getStatus());
        verify(memberships).save(inactive);
    }

    @Test
    void acceptingStaleInvitationDoesNotReplaceAnActiveMembershipRole() {
        User user = user(7L);
        Organization organization = organization(41L);
        RoleDefinition admin = new RoleDefinition(
                organization, RoleScope.ORGANIZATION, "Admin", "admin", "ADMIN");
        RoleDefinition viewer = new RoleDefinition(
                organization, RoleScope.ORGANIZATION, "Viewer", "viewer", "VIEWER");
        Invitation invitation = new Invitation(
                organization,
                user.getEmail(),
                OrganizationRole.VIEWER,
                viewer,
                "token",
                user(8L),
                OffsetDateTime.now().plusDays(1));
        OrganizationMembership active = membership(organization, user, MembershipStatus.ACTIVE);
        active.setRole(OrganizationRole.ADMIN);
        active.setRoleDefinition(admin);
        InvitationRepository invitations = mock();
        OrganizationMembershipRepository memberships = mock();
        UserLookupService users = mock();
        InvitationManagementService service = new InvitationManagementService(
                mock(WorkspaceAccessService.class),
                invitations,
                memberships,
                mock(OrganizationRepository.class),
                users,
                mock(WorkspaceAuthorizationService.class),
                mock(AuditLogService.class),
                mock(RoleSeedService.class),
                mock(RoleDefinitionRepository.class),
                mock(UserRepository.class));
        when(users.requireById(7L)).thenReturn(user);
        when(invitations.findByToken("token")).thenReturn(Optional.of(invitation));
        when(memberships.findByOrganizationIdAndUserId(41L, 7L)).thenReturn(Optional.of(active));

        service.acceptInvitation(7L, "token");

        assertEquals(OrganizationRole.ADMIN, active.getRole());
        assertSame(admin, active.getRoleDefinition());
        assertEquals(InvitationStatus.ACCEPTED, invitation.getStatus());
        verify(memberships, never()).save(any());
    }

    private OrganizationMembership membership(
            Organization organization,
            User user,
            MembershipStatus status) {
        return new OrganizationMembership(organization, user, OrganizationRole.MEMBER, status);
    }

    private Organization organization(Long id) {
        Organization organization = new Organization();
        organization.setId(id);
        organization.setName("Organization " + id);
        organization.setSlug("organization-" + id);
        return organization;
    }

    private User user(Long id) {
        User user = newUser(id);
        user.setId(id);
        return user;
    }

    private User newUser(Long seed) {
        return new User(
                "user-" + seed,
                "user-" + seed + "@example.com",
                "hash",
                "User " + seed,
                SystemRole.USER);
    }
}
