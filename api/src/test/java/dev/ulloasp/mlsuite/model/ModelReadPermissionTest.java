package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.application.service.ModelServiceImpl;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.service.LegacyRolePermissionMapper;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

class ModelReadPermissionTest {
    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final ModelRepository models = mock(ModelRepository.class);
    private final Organization organization = new Organization();
    private ModelServiceImpl service;

    @BeforeEach
    void setUp() {
        organization.setId(41L);
        when(access.requireCurrentOrganization(3L)).thenReturn(organization);
        var authorization = new WorkspaceAuthorizationService(access, mock(RoleDefinitionRepository.class),
                mock(RoleSeedService.class), new LegacyRolePermissionMapper());
        service = new ModelServiceImpl(mock(UserLookupService.class), models, mock(ObjectStorageService.class),
                mock(SchemaModelBindingRepository.class), mock(PredictionResultRepository.class), access, authorization);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void modelViewPermissionAllowsCatalogWithoutOrganizationView(boolean paginated) {
        membership(Set.of(PermissionKey.VIEW_MODELS));
        allowCatalog(paginated);
        assertDoesNotThrow(() -> read(paginated));
        verifyCatalog(paginated);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void organizationViewAloneDoesNotExposeModels(boolean paginated) {
        membership(Set.of(PermissionKey.VIEW_ORGANIZATION));
        assertThrows(OrganizationAccessDeniedException.class, () -> read(paginated));
        verifyNoInteractions(models);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void userOutsideOrganizationCannotReadModels(boolean paginated) {
        when(access.requireMembership(3L, 41L)).thenThrow(new OrganizationAccessDeniedException(41L));
        assertThrows(OrganizationAccessDeniedException.class, () -> read(paginated));
        verifyNoInteractions(models);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void superadminCanReadWithoutMembership(boolean paginated) {
        when(access.isSuperadmin(3L)).thenReturn(true);
        allowCatalog(paginated);
        assertDoesNotThrow(() -> read(paginated));
        verifyCatalog(paginated);
        verify(access, never()).requireMembership(3L, 41L);
    }

    private void membership(Set<PermissionKey> permissions) {
        var role = new RoleDefinition();
        role.setPermissions(permissions);
        var membership = new OrganizationMembership();
        membership.setOrganization(organization);
        membership.setRoleDefinition(role);
        when(access.requireMembership(3L, 41L)).thenReturn(membership);
    }

    private void allowCatalog(boolean paginated) {
        if (paginated) when(models.findCatalogPage(eq(41L), anyString(), anyBoolean(), anyBoolean(), any(Pageable.class)))
                .thenReturn(Page.empty());
        else when(models.findByOrganizationIdAndArchivedAtIsNull(41L)).thenReturn(List.of());
    }

    private void verifyCatalog(boolean paginated) {
        if (paginated) verify(models).findCatalogPage(eq(41L), eq(""), eq(false), eq(false), any(Pageable.class));
        else verify(models).findByOrganizationIdAndArchivedAtIsNull(41L);
    }

    private void read(boolean paginated) {
        if (paginated) service.getModelPage(3L, 0, 24, "", "updated", "active");
        else service.getModels(3L);
    }
}
