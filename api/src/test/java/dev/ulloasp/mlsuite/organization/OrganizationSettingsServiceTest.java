package dev.ulloasp.mlsuite.organization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.audit.adapter.out.persistence.repository.AuditEventRepository;
import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationRequest;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationDeletionService;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationManagementService;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAlreadyExistsException;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class OrganizationSettingsServiceTest {

    @Mock private WorkspaceAccessService workspaceAccessService;
    @Mock private WorkspaceAuthorizationService workspaceAuthorizationService;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private OrganizationMembershipRepository membershipRepository;
    @Mock private ModelRepository modelRepository;
    @Mock private InvitationRepository invitationRepository;
    @Mock private RoleSeedService roleSeedService;
    @Mock private RoleDefinitionRepository roleRepository;
    @Mock private SchemaRepository schemaRepository;
    @Mock private PluginMetadataRepository pluginRepository;
    @Mock private SchemaReviewRepository reviewRepository;
    @Mock private AuditEventRepository auditRepository;
    @Mock private UserRepository userRepository;

    private OrganizationDeletionService deletionService;
    private OrganizationManagementService managementService;

    @BeforeEach
    void setUp() {
        deletionService = new OrganizationDeletionService(
                organizationRepository,
                membershipRepository,
                modelRepository,
                schemaRepository,
                pluginRepository,
                invitationRepository,
                roleRepository,
                reviewRepository,
                auditRepository,
                userRepository);
        managementService = new OrganizationManagementService(
                workspaceAccessService,
                workspaceAuthorizationService,
                organizationRepository,
                membershipRepository,
                modelRepository,
                invitationRepository,
                roleSeedService,
                roleRepository,
                deletionService);
    }

    @Test
    void ownerCanDeleteEmptyOrganization() {
        Organization organization = organization();
        OrganizationMembership owner = new OrganizationMembership();
        when(organizationRepository.findById(41L)).thenReturn(Optional.of(organization));
        when(membershipRepository.findByOrganizationId(41L)).thenReturn(List.of(owner));
        when(roleRepository.findByOrganizationId(41L)).thenReturn(List.of());

        managementService.deleteOrganization(7L, 41L);

        verify(workspaceAuthorizationService).requireOrganizationDelete(7L, 41L);
        verify(membershipRepository).deleteAll(List.of(owner));
        verify(roleRepository).deleteAll(List.of());
        verify(userRepository).clearCurrentOrganization(41L);
        verify(organizationRepository).delete(organization);
    }

    @Test
    void superadminCanDeleteEmptyOrganizationWithoutMembership() {
        Organization organization = organization();
        when(organizationRepository.findById(41L)).thenReturn(Optional.of(organization));

        managementService.deleteOrganization(1L, 41L);

        verify(workspaceAuthorizationService).requireOrganizationDelete(1L, 41L);
        verify(workspaceAccessService, never()).requireMembership(1L, 41L);
        verify(organizationRepository).delete(organization);
    }

    @Test
    void deleteDenialStopsBeforeLookup() {
        doThrow(new OrganizationAccessDeniedException(41L))
                .when(workspaceAuthorizationService).requireOrganizationDelete(9L, 41L);

        assertThrows(OrganizationAccessDeniedException.class,
                () -> managementService.deleteOrganization(9L, 41L));

        verify(organizationRepository, never()).findById(41L);
    }

    @Test
    void nonEmptyOrganizationCannotBeDeleted() {
        when(organizationRepository.findById(41L)).thenReturn(Optional.of(organization()));
        when(modelRepository.countByOrganizationId(41L)).thenReturn(1L);

        assertThrows(ResponseStatusException.class,
                () -> managementService.deleteOrganization(7L, 41L));

        verify(organizationRepository, never()).delete(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void deleteRejectsMissingOrganization() {
        when(organizationRepository.findById(41L)).thenReturn(Optional.empty());

        assertThrows(OrganizationNotFoundException.class,
                () -> managementService.deleteOrganization(7L, 41L));
    }

    @Test
    void ownerCanUpdateOrganization() {
        Organization organization = organization();
        User owner = user(7L);
        when(organizationRepository.findById(41L)).thenReturn(Optional.of(organization));
        when(workspaceAccessService.requireUser(7L)).thenReturn(owner);
        when(organizationRepository.save(organization)).thenReturn(organization);

        var result = managementService.updateOrganization(
                7L, 41L, new UpdateOrganizationRequest("Acme Lab", "acme-lab", "Description"));

        assertEquals("acme-lab", result.slug());
        verify(workspaceAuthorizationService).requireOrganizationEdit(7L, 41L);
    }

    @Test
    void superadminCanUpdateOrganizationWithoutMembership() {
        Organization organization = organization();
        when(organizationRepository.findById(41L)).thenReturn(Optional.of(organization));
        when(workspaceAccessService.requireUser(1L)).thenReturn(user(1L));
        when(organizationRepository.save(organization)).thenReturn(organization);

        managementService.updateOrganization(
                1L, 41L, new UpdateOrganizationRequest("Acme Lab", null, null));

        verify(workspaceAccessService, never()).requireMembership(1L, 41L);
        assertEquals("org", organization.getSlug());
    }

    @Test
    void updateRejectsDuplicateSlug() {
        when(organizationRepository.findById(41L)).thenReturn(Optional.of(organization()));
        when(organizationRepository.existsBySlug("taken")).thenReturn(true);

        assertThrows(OrganizationAlreadyExistsException.class,
                () -> managementService.updateOrganization(
                        7L, 41L, new UpdateOrganizationRequest("Acme", "taken", null)));
    }

    @Test
    void updateRejectsMissingOrganization() {
        when(organizationRepository.findById(41L)).thenReturn(Optional.empty());

        assertThrows(OrganizationNotFoundException.class,
                () -> managementService.updateOrganization(
                        1L, 41L, new UpdateOrganizationRequest("Acme", null, null)));
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setName("Org");
        organization.setSlug("org");
        return organization;
    }

    private User user(Long id) {
        User user = new User();
        user.setId(id);
        return user;
    }
}
