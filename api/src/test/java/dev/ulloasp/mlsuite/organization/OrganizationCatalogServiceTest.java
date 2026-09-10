package dev.ulloasp.mlsuite.organization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationCatalogService;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
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
    @Mock private PredictionRunRepository predictionRunRepository;

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
                predictionRunRepository);
    }

    @Test
    void getPage_ReturnsStatsAndOwnerForSuperadmin() {
        Organization organization = organization();
        OrganizationMembership owner = membership(organization, user(2L, "Owner"));
        when(workspaceAccessService.isSuperadmin(1L)).thenReturn(true);
        when(organizationRepository.findCatalogPage(eq("north"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(organization)));
        when(membershipRepository.findActiveByOrganizationIdOrderByCreatedAtAsc(41L))
                .thenReturn(List.of(owner));
        when(modelRepository.countByOrganizationId(41L)).thenReturn(3L);
        when(schemaRepository.countByOrganizationId(41L)).thenReturn(4L);
        when(pluginRepository.countByOrganizationId(41L)).thenReturn(5L);
        when(predictionRunRepository.countByOrganizationId(41L)).thenReturn(7L);
        when(membershipRepository.countActiveByOrganizationId(41L)).thenReturn(6L);

        var page = service.getPage(1L, 0, 24, " north ", "updated");

        assertEquals(1, page.items().size());
        var item = page.items().get(0);
        assertEquals("Northwind", item.name());
        assertEquals("Owner", item.ownerName());
        assertEquals("Editor", item.updatedByName());
        assertEquals(3L, item.modelCount());
        assertEquals(4L, item.schemaCount());
        assertEquals(5L, item.pluginCount());
        assertEquals(7L, item.inferenceCount());
        assertEquals(6L, item.memberCount());
        assertFalse(Arrays.stream(item.getClass().getRecordComponents())
                .anyMatch(component -> component.getName().equals("publicAccess")));
    }

    @Test
    void getPage_DeniesNonSuperadmin() {
        when(workspaceAccessService.isSuperadmin(9L)).thenReturn(false);

        assertThrows(ResponseStatusException.class,
                () -> service.getPage(9L, 0, 24, "", "updated"));
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setName("Northwind");
        organization.setSlug("northwind");
        organization.setDescription("Ops workspace");
        organization.setCreatedAt(OffsetDateTime.parse("2025-01-01T00:00:00Z"));
        organization.setUpdatedAt(OffsetDateTime.parse("2025-01-02T00:00:00Z"));
        organization.setCreatedBy(user(1L, "Creator"));
        organization.setUpdatedBy(user(4L, "Editor"));
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
