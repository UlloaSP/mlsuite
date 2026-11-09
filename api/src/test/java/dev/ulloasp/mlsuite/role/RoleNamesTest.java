package dev.ulloasp.mlsuite.role;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleTemplateRepository;
import dev.ulloasp.mlsuite.role.application.dto.CreateRoleRequest;
import dev.ulloasp.mlsuite.role.application.dto.UpdateRoleRequest;
import dev.ulloasp.mlsuite.role.application.service.RoleCatalogService;
import dev.ulloasp.mlsuite.role.application.service.RoleManagementService;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.support.TestFixtures;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

/** A role's name is one role's in its organization, whatever its case. */
class RoleNamesTest {

    private final RoleDefinitionRepository roles = mock(RoleDefinitionRepository.class);
    private final OrganizationRepository organizations = mock(OrganizationRepository.class);
    private RoleManagementService service;
    private Organization team;
    private RoleDefinition reviewer;

    @BeforeEach
    void setUp() {
        service = new RoleManagementService(mock(WorkspaceAuthorizationService.class), mock(RoleCatalogService.class),
                roles, mock(RoleTemplateRepository.class), organizations, mock(OrganizationMembershipRepository.class),
                mock(InvitationRepository.class), mock(UserLookupService.class), mock(AuditLogService.class),
                TestFixtures.principals());
        team = TestFixtures.organization();
        reviewer = TestFixtures.role(team, null, PermissionKey.REVIEW);
        reviewer.setName("Reviewer");
        reviewer.setId(5L);
        when(organizations.findById(41L)).thenReturn(Optional.of(team));
        when(roles.findByOrganizationIdAndNameIgnoreCase(41L, "reviewer")).thenReturn(Optional.of(reviewer));
    }

    @Test
    void aNewRoleTakesNoNameAnotherRoleHas() {
        ResponseStatusException refused = assertThrows(ResponseStatusException.class,
                () -> service.create(7L, 41L, new CreateRoleRequest("reviewer", null, List.of("REVIEW"))));

        assertEquals(HttpStatus.CONFLICT, refused.getStatusCode());
        verify(roles, never()).save(any());
    }

    @Test
    void aRenamedRoleTakesNoNameAnotherRoleHasButMayKeepItsOwn() {
        RoleDefinition analyst = TestFixtures.role(team, null, PermissionKey.VIEW_MODELS);
        analyst.setName("Analyst");
        analyst.setId(6L);
        when(roles.findByIdAndOrganizationId(6L, 41L)).thenReturn(Optional.of(analyst));
        when(roles.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(reviewer));
        when(roles.save(any())).thenAnswer(call -> call.getArgument(0));

        ResponseStatusException refused = assertThrows(ResponseStatusException.class,
                () -> service.update(7L, 41L, 6L, new UpdateRoleRequest("reviewer", null, List.of("VIEW_MODELS"))));
        assertEquals(HttpStatus.CONFLICT, refused.getStatusCode());

        service.update(7L, 41L, 5L, new UpdateRoleRequest("reviewer", "Reads runs", List.of("REVIEW")));
        assertEquals("reviewer", reviewer.getName());
    }
}
