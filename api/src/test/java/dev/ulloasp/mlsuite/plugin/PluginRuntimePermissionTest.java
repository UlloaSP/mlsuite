package dev.ulloasp.mlsuite.plugin;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.*;
import dev.ulloasp.mlsuite.plugin.application.service.*;
import dev.ulloasp.mlsuite.plugin.domain.model.StoredPlugin;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.service.*;
import dev.ulloasp.mlsuite.role.domain.model.*;
import dev.ulloasp.mlsuite.workspace.application.service.*;

class PluginRuntimePermissionTest {
    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final PluginObjectReader objects = mock(PluginObjectReader.class);
    private final Organization organization = new Organization();
    private WorkspaceAuthorizationService authorization;
    private PluginRuntimeService runtime;

    @BeforeEach
    void setUp() {
        organization.setId(41L);
        when(access.requireCurrentOrganization(3L)).thenReturn(organization);
        authorization = new WorkspaceAuthorizationService(access, mock(RoleDefinitionRepository.class),
                mock(RoleSeedService.class), new LegacyRolePermissionMapper());
        runtime = new PluginRuntimeService(access, authorization, objects);
    }

    @ParameterizedTest
    @EnumSource(value = PermissionKey.class, names = {"VIEW_MODELS", "RUN_PREDICTIONS", "REVIEW", "MANAGE_REVIEWS", "VIEW_PLUGINS"})
    void runtimePermissionLoadsOnlyCurrentOrganizationSources(PermissionKey permission) {
        membership(permission);
        var time = OffsetDateTime.now();
        when(objects.list(41L)).thenReturn(List.of(new StoredPlugin("qa", "qa.ts", "text/typescript", 12,
                time, time, "private name", "private@example.test", "private avatar", "export default {}")));
        var result = runtime.list(3L);
        assertEquals("export default {}", result.getFirst().source());
        assertEquals(7, result.getFirst().getClass().getRecordComponents().length);
        verify(objects).list(41L);
        verifyNoMoreInteractions(objects);
        if (permission != PermissionKey.VIEW_PLUGINS) {
            assertThrows(OrganizationAccessDeniedException.class, () -> authorization.requirePluginView(3L, 41L));
        }
    }

    @Test
    void organizationVisibilityAloneCannotLoadRuntimeSources() {
        membership(PermissionKey.VIEW_ORGANIZATION);
        assertThrows(OrganizationAccessDeniedException.class, () -> runtime.list(3L));
        verifyNoInteractions(objects);
    }

    @Test
    void foreignOrganizationDeniedBeforeStorageRead() {
        when(access.requireMembership(3L, 41L)).thenThrow(new OrganizationAccessDeniedException(41L));
        assertThrows(OrganizationAccessDeniedException.class, () -> runtime.list(3L));
        verifyNoInteractions(objects);
    }

    private void membership(PermissionKey permission) {
        var role = new RoleDefinition(); role.setPermissions(Set.of(permission));
        var member = new OrganizationMembership();
        member.setOrganization(organization); member.setRoleDefinition(role);
        when(access.requireMembership(3L, 41L)).thenReturn(member);
    }
}
