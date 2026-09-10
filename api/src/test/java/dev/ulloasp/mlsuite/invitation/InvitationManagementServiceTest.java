package dev.ulloasp.mlsuite.invitation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.invitation.application.dto.CreateInvitationRequest;
import dev.ulloasp.mlsuite.invitation.application.usecase.InvitationManagementService;
import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.role.domain.model.OrganizationSystemRole;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspacePermissionsDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class InvitationManagementServiceTest {

    @Mock
    private WorkspaceAccessService workspaceAccessService;

    @Mock
    private InvitationRepository invitationRepository;

    @Mock
    private OrganizationMembershipRepository organizationMembershipRepository;

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private UserLookupService userLookupService;

    @Mock
    private WorkspaceAuthorizationService workspaceAuthorizationService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private RoleSeedService roleSeedService;

    @Mock
    private RoleDefinitionRepository roleDefinitionRepository;

    @Mock
    private UserRepository userRepository;

    private InvitationManagementService service;

    @BeforeEach
    void setUp() {
        service = new InvitationManagementService(
                workspaceAccessService,
                invitationRepository,
                organizationMembershipRepository,
                organizationRepository,
                userLookupService,
                workspaceAuthorizationService,
                auditLogService,
                roleSeedService,
                roleDefinitionRepository,
                userRepository);
    }

    @Test
    void createInvitation_AllowsReviewerAsLegacyViewer() {
        Organization org = organization();
        User actor = user(7L);
        RoleDefinition reviewerRole = reviewerRole(org);
        when(workspaceAccessService.requireUser(7L)).thenReturn(actor);
        when(organizationRepository.findById(41L)).thenReturn(Optional.of(org));
        when(workspaceAuthorizationService.workspacePermissions(7L, 41L)).thenReturn(permissions());
        when(roleDefinitionRepository.findByIdAndOrganizationId(5L, 41L))
                .thenReturn(Optional.of(reviewerRole));
        when(invitationRepository.save(any(Invitation.class))).thenAnswer(inv -> {
            Invitation invitation = inv.getArgument(0);
            invitation.setId(12L);
            return invitation;
        });

        var result = service.createInvitation(
                7L,
                41L,
                new CreateInvitationRequest("reviewer@example.com", null, 5L));

        assertEquals(OrganizationRole.VIEWER.name(), result.role());
        assertEquals(5L, result.roleDefinition().id());
    }

    @Test
    void createInvitation_AcceptsImmediatelyWhenInviterIsSuperadmin() {
        Organization org = organization();
        User actor = user(7L);
        actor.setSystemRole(SystemRole.SUPERADMIN);
        User invitee = user(8L);
        invitee.setEmail("target@example.com");
        RoleDefinition role = reviewerRole(org);
        when(workspaceAccessService.requireUser(7L)).thenReturn(actor);
        when(organizationRepository.findById(41L)).thenReturn(Optional.of(org));
        when(workspaceAuthorizationService.workspacePermissions(7L, 41L)).thenReturn(permissions());
        when(roleDefinitionRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(role));
        when(userRepository.findByEmailIgnoreCase("target@example.com")).thenReturn(Optional.of(invitee));
        when(organizationMembershipRepository.findByOrganizationIdAndUserId(41L, 8L)).thenReturn(Optional.empty());
        when(invitationRepository.save(any(Invitation.class))).thenAnswer(inv -> {
            Invitation invitation = inv.getArgument(0);
            invitation.setId(12L);
            return invitation;
        });

        var result = service.createInvitation(
                7L,
                41L,
                new CreateInvitationRequest("target@example.com", null, 5L));

        assertEquals("ACCEPTED", result.status());
        assertEquals(org, invitee.getCurrentOrganization());
        ArgumentCaptor<OrganizationMembership> membership = ArgumentCaptor.forClass(OrganizationMembership.class);
        verify(organizationMembershipRepository).save(membership.capture());
        assertEquals(invitee, membership.getValue().getUser());
        assertEquals(role, membership.getValue().getRoleDefinition());
    }

    @Test
    void createInvitation_StaysPendingWhenInviterIsNotSuperadmin() {
        Organization org = organization();
        User actor = user(7L);
        RoleDefinition role = reviewerRole(org);
        when(workspaceAccessService.requireUser(7L)).thenReturn(actor);
        when(organizationRepository.findById(41L)).thenReturn(Optional.of(org));
        when(workspaceAuthorizationService.workspacePermissions(7L, 41L)).thenReturn(permissions());
        when(roleDefinitionRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(role));
        when(invitationRepository.save(any(Invitation.class))).thenAnswer(inv -> {
            Invitation invitation = inv.getArgument(0);
            invitation.setId(12L);
            return invitation;
        });

        var result = service.createInvitation(
                7L,
                41L,
                new CreateInvitationRequest("target@example.com", null, 5L));

        assertEquals("PENDING", result.status());
        verifyNoInteractions(organizationMembershipRepository);
    }

    @Test
    void listInvitationCandidates_ReturnsEnabledUsersOutsideOrganization() {
        User candidate = user(8L);
        candidate.setEmail("user@example.com");
        candidate.setFullName("User Example");
        when(userRepository.findEnabledUsersOutsideActiveOrganization(41L))
                .thenReturn(List.of(candidate));

        var result = service.listInvitationCandidates(7L, 41L);

        assertEquals(1, result.size());
        assertEquals(8L, result.get(0).id());
        assertEquals("User Example", result.get(0).fullName());
        assertEquals("user@example.com", result.get(0).email());
        verify(workspaceAuthorizationService).requireInvitationCreate(7L, 41L);
    }

    @Test
    void listInvitationCandidates_StopsWhenUserCannotManageInvitations() {
        doThrow(new IllegalArgumentException("Denied"))
                .when(workspaceAuthorizationService)
                .requireInvitationCreate(7L, 41L);

        assertThrows(IllegalArgumentException.class, () -> service.listInvitationCandidates(7L, 41L));

        verifyNoInteractions(userRepository);
    }

    @Test
    void listInvitations_RedactsTokensForViewOnlyAccess() {
        Organization org = organization();
        Invitation invitation = new Invitation(
                org,
                "target@example.com",
                OrganizationRole.MEMBER,
                reviewerRole(org),
                "secret-token",
                user(7L),
                OffsetDateTime.now().plusDays(1));
        when(workspaceAuthorizationService.requireInvitationView(7L, 41L))
                .thenReturn(viewOnlyPermissions());
        when(invitationRepository.findByOrganizationIdOrderByCreatedAtDesc(41L))
                .thenReturn(List.of(invitation));

        var result = service.listInvitations(7L, 41L);

        assertEquals(1, result.size());
        assertEquals(null, result.get(0).token());
        verify(workspaceAuthorizationService).requireInvitationView(7L, 41L);
    }

    @Test
    void listInvitations_StopsWhenUserCannotViewInvitations() {
        doThrow(new IllegalArgumentException("Denied"))
                .when(workspaceAuthorizationService)
                .requireInvitationView(7L, 41L);

        assertThrows(IllegalArgumentException.class, () -> service.listInvitations(7L, 41L));

        verifyNoInteractions(invitationRepository);
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setName("Org");
        organization.setSlug("org");
        return organization;
    }

    private RoleDefinition reviewerRole(Organization org) {
        OrganizationSystemRole systemRole = OrganizationSystemRole.REVIEWER;
        RoleDefinition role = new RoleDefinition(
                org,
                RoleScope.ORGANIZATION,
                systemRole.label(),
                systemRole.slug(),
                systemRole.systemKey());
        role.setId(5L);
        return role;
    }

    private User user(Long id) {
        User user = new User();
        user.setId(id);
        user.setEmail("admin@example.com");
        user.setFullName("Admin");
        return user;
    }

    private WorkspacePermissionsDto permissions() {
        return new WorkspacePermissionsDto(
                true, true, true, false, false, true, true, true, true, true, true,
                true, true, true, true, true, true, true, true, true, true);
    }

    private WorkspacePermissionsDto viewOnlyPermissions() {
        return new WorkspacePermissionsDto(
                false, false, false, false, false, false, false, false, false, true, false,
                false, false, false, false, false, false, false, false, false, false);
    }
}
