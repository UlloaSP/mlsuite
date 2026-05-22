package dev.ulloasp.mlsuite.organization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamMembershipRepository;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamRepository;
import dev.ulloasp.mlsuite.organization.application.dto.TransferOrganizationOwnershipRequest;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationMembershipRoleRequest;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationManagementService;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.role.domain.model.OrganizationSystemRole;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.dto.MembershipActionsDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class OrganizationManagementServiceTest {

    @Mock
    private WorkspaceAccessService workspaceAccessService;

    @Mock
    private WorkspaceAuthorizationService workspaceAuthorizationService;

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private OrganizationMembershipRepository membershipRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private TeamMembershipRepository teamMembershipRepository;

    @Mock
    private ModelRepository modelRepository;

    @Mock
    private InvitationRepository invitationRepository;

    @Mock
    private RoleSeedService roleSeedService;

    @Mock
    private RoleDefinitionRepository roleDefinitionRepository;

    private OrganizationManagementService service;

    @BeforeEach
    void setUp() {
        service = new OrganizationManagementService(
                workspaceAccessService,
                workspaceAuthorizationService,
                organizationRepository,
                membershipRepository,
                teamRepository,
                teamMembershipRepository,
                modelRepository,
                invitationRepository,
                roleSeedService,
                roleDefinitionRepository);
    }

    @Test
    void transferOwnership_MovesOwnerToTargetActiveMember() {
        OrganizationMembership owner = membership(1L, OrganizationRole.OWNER, MembershipStatus.ACTIVE);
        OrganizationMembership target = membership(2L, OrganizationRole.MEMBER, MembershipStatus.ACTIVE);
        when(membershipRepository.findById(2L)).thenReturn(Optional.of(target));
        when(membershipRepository.findByOrganizationIdAndStatusOrderByCreatedAtAsc(41L, MembershipStatus.ACTIVE))
                .thenReturn(List.of(owner, target));
        when(membershipRepository.save(owner)).thenReturn(owner);
        when(membershipRepository.save(target)).thenReturn(target);

        var result = service.transferOwnership(7L, 41L, new TransferOrganizationOwnershipRequest(2L));

        assertEquals(OrganizationRole.ADMIN, owner.getRole());
        assertEquals(OrganizationRole.OWNER, target.getRole());
        assertEquals(2L, result.id());
        verify(workspaceAuthorizationService).requireOwnershipTransfer(7L, 41L);
    }

    @Test
    void transferOwnership_DeniesActorWithoutTransferPermission() {
        doThrow(new OrganizationAccessDeniedException(41L))
                .when(workspaceAuthorizationService).requireOwnershipTransfer(8L, 41L);

        assertThrows(OrganizationAccessDeniedException.class,
                () -> service.transferOwnership(8L, 41L, new TransferOrganizationOwnershipRequest(2L)));
    }

    @Test
    void transferOwnership_RejectsInactiveTarget() {
        when(membershipRepository.findById(2L))
                .thenReturn(Optional.of(membership(2L, OrganizationRole.MEMBER, MembershipStatus.REMOVED)));

        assertThrows(IllegalArgumentException.class,
                () -> service.transferOwnership(7L, 41L, new TransferOrganizationOwnershipRequest(2L)));
    }

    @Test
    void transferOwnership_RejectsOrganizationWithoutOwner() {
        OrganizationMembership target = membership(2L, OrganizationRole.MEMBER, MembershipStatus.ACTIVE);
        when(membershipRepository.findById(2L)).thenReturn(Optional.of(target));
        when(membershipRepository.findByOrganizationIdAndStatusOrderByCreatedAtAsc(41L, MembershipStatus.ACTIVE))
                .thenReturn(List.of(target));

        assertThrows(IllegalArgumentException.class,
                () -> service.transferOwnership(7L, 41L, new TransferOrganizationOwnershipRequest(2L)));
    }

    @Test
    void updateMemberRole_AllowsExternalReviewerAsLegacyViewer() {
        OrganizationMembership target = membership(2L, OrganizationRole.MEMBER, MembershipStatus.ACTIVE);
        RoleDefinition reviewerRole = externalReviewerRole();
        when(membershipRepository.findById(2L)).thenReturn(Optional.of(target));
        when(workspaceAuthorizationService.organizationMemberActions(7L, 41L, target))
                .thenReturn(new MembershipActionsDto(
                        true,
                        true,
                        List.of(RoleSummaryDto.from(reviewerRole))));
        when(roleDefinitionRepository.findByIdAndOrganizationId(5L, 41L))
                .thenReturn(Optional.of(reviewerRole));
        when(membershipRepository.save(target)).thenReturn(target);

        var result = service.updateMemberRole(7L, 41L, 2L, new UpdateOrganizationMembershipRoleRequest(5L));

        assertEquals(OrganizationRole.VIEWER, target.getRole());
        assertEquals(5L, target.getRoleDefinition().getId());
        assertEquals("VIEWER", result.role());
    }

    private OrganizationMembership membership(Long id, OrganizationRole role, MembershipStatus status) {
        OrganizationMembership membership = new OrganizationMembership();
        membership.setId(id);
        membership.setOrganization(organization());
        membership.setUser(user(id));
        membership.setRole(role);
        membership.setStatus(status);
        return membership;
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setName("Org");
        organization.setSlug("org");
        return organization;
    }

    private RoleDefinition externalReviewerRole() {
        OrganizationSystemRole systemRole = OrganizationSystemRole.EXTERNAL_REVIEWER;
        RoleDefinition role = new RoleDefinition(
                organization(),
                null,
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
        user.setEmail("user" + id + "@example.com");
        user.setFullName("User " + id);
        return user;
    }
}
