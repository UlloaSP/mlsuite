package dev.ulloasp.mlsuite.organization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.audit.adapter.out.persistence.repository.AuditEventRepository;
import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationCatalogService;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewLinkRepository;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamRepository;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;

@ExtendWith(MockitoExtension.class)
class OrganizationCatalogServiceTest {

    @Mock private WorkspaceAccessService workspaceAccessService;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private OrganizationMembershipRepository membershipRepository;
    @Mock private ModelRepository modelRepository;
    @Mock private SchemaRepository schemaRepository;
    @Mock private PluginMetadataRepository pluginRepository;
    @Mock private TeamRepository teamRepository;
    @Mock private InvitationRepository invitationRepository;
    @Mock private RoleDefinitionRepository roleRepository;
    @Mock private SchemaReviewLinkRepository reviewLinkRepository;
    @Mock private AuditEventRepository auditRepository;
    @Mock private UserRepository userRepository;

    private OrganizationCatalogService service;

    @BeforeEach
    void setUp() {
        service = new OrganizationCatalogService(
                workspaceAccessService,
                organizationRepository,
                membershipRepository,
                modelRepository,
                schemaRepository,
                pluginRepository,
                teamRepository,
                invitationRepository,
                roleRepository,
                reviewLinkRepository,
                auditRepository,
                userRepository);
    }

    @Test
    void getPage_ReturnsStatsAndOwnerForSuperadmin() {
        Organization organization = organization();
        OrganizationMembership owner = membership(organization, user(2L, "Owner"));
        when(workspaceAccessService.isSuperadmin(1L)).thenReturn(true);
        when(organizationRepository.findCatalogPage(eq("north"), eq("all"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(organization)));
        when(membershipRepository.findByOrganizationIdAndStatusOrderByCreatedAtAsc(41L, MembershipStatus.ACTIVE))
                .thenReturn(List.of(owner));
        when(modelRepository.countByOrganizationId(41L)).thenReturn(3L);
        when(schemaRepository.countByOrganizationId(41L)).thenReturn(4L);
        when(pluginRepository.countByOrganizationId(41L)).thenReturn(5L);
        when(membershipRepository.countByOrganizationIdAndStatus(41L, MembershipStatus.ACTIVE)).thenReturn(6L);

        var page = service.getPage(1L, 0, 24, " north ", "all", "updated");

        assertEquals(1, page.items().size());
        var item = page.items().get(0);
        assertEquals("Northwind", item.name());
        assertEquals("Owner", item.ownerName());
        assertEquals(3L, item.modelCount());
        assertEquals(4L, item.schemaCount());
        assertEquals(5L, item.pluginCount());
        assertEquals(6L, item.memberCount());
    }

    @Test
    void deleteOrganization_RemovesEmptyOrganization() {
        Organization organization = organization();
        OrganizationMembership member = membership(organization, user(3L, "Member"));
        when(workspaceAccessService.isSuperadmin(1L)).thenReturn(true);
        when(organizationRepository.findById(41L)).thenReturn(Optional.of(organization));
        when(membershipRepository.findByOrganizationId(41L)).thenReturn(List.of(member));
        when(roleRepository.findByOrganizationId(41L)).thenReturn(List.of());

        service.deleteOrganization(1L, 41L);

        verify(membershipRepository).deleteAll(List.of(member));
        verify(roleRepository).deleteAll(List.of());
        verify(userRepository).clearCurrentOrganization(41L);
        verify(organizationRepository).delete(organization);
    }

    @Test
    void deleteOrganization_BlocksNonEmptyOrganization() {
        when(workspaceAccessService.isSuperadmin(1L)).thenReturn(true);
        when(organizationRepository.findById(41L)).thenReturn(Optional.of(organization()));
        when(modelRepository.countByOrganizationId(41L)).thenReturn(1L);

        assertThrows(ResponseStatusException.class, () -> service.deleteOrganization(1L, 41L));
    }

    @Test
    void getPage_DeniesNonSuperadmin() {
        when(workspaceAccessService.isSuperadmin(9L)).thenReturn(false);

        assertThrows(ResponseStatusException.class,
                () -> service.getPage(9L, 0, 24, "", "all", "updated"));
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setName("Northwind");
        organization.setSlug("northwind");
        organization.setDescription("Ops workspace");
        organization.setCreatedAt(OffsetDateTime.parse("2025-01-01T00:00:00Z"));
        organization.setUpdatedAt(OffsetDateTime.parse("2025-01-02T00:00:00Z"));
        return organization;
    }

    private OrganizationMembership membership(Organization organization, User user) {
        OrganizationMembership membership = new OrganizationMembership();
        membership.setId(user.getId());
        membership.setOrganization(organization);
        membership.setUser(user);
        membership.setRole(OrganizationRole.OWNER);
        membership.setStatus(MembershipStatus.ACTIVE);
        return membership;
    }

    private User user(Long id, String name) {
        User user = new User();
        user.setId(id);
        user.setFullName(name);
        user.setEmail(name.toLowerCase() + "@example.com");
        return user;
    }
}
