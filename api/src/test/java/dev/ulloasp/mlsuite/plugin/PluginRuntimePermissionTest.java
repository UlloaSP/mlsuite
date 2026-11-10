package dev.ulloasp.mlsuite.plugin;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.*;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginRuntimeSourceDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.SnapshotPluginsUseCase;
import dev.ulloasp.mlsuite.plugin.application.service.*;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.plugin.domain.model.StoredPlugin;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.service.*;
import dev.ulloasp.mlsuite.role.domain.model.*;
import dev.ulloasp.mlsuite.workspace.application.service.*;

class PluginRuntimePermissionTest {
    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final PluginObjectReader objects = mock(PluginObjectReader.class);
    private final PluginMetadataRepository metadata = mock(PluginMetadataRepository.class);
    private final SnapshotPluginsUseCase snapshots = mock(SnapshotPluginsUseCase.class);
    private final Organization organization = new Organization();
    private WorkspaceAuthorizationService authorization;
    private PluginRuntimeService runtime;

    @BeforeEach
    void setUp() {
        organization.setId(41L);
        when(access.requireCurrentOrganization(3L)).thenReturn(organization);
        authorization = new WorkspaceAuthorizationService(access, mock(RoleDefinitionRepository.class));
        runtime = new PluginRuntimeService(access, authorization, objects, metadata, snapshots);
    }

    @ParameterizedTest
    @EnumSource(value = PermissionKey.class, names = {"VIEW_MODELS", "RUN_PREDICTIONS", "REVIEW", "MANAGE_REVIEWS", "VIEW_PLUGINS"})
    void runtimePermissionLoadsOnlyCurrentOrganizationSources(PermissionKey permission) {
        membership(permission);
        var time = OffsetDateTime.now();
        PluginMetadata row = new PluginMetadata();
        when(metadata.findByOrganizationIdOrderByIdAsc(41L)).thenReturn(List.of(row));
        when(objects.readPinned(row)).thenReturn(Optional.of(new StoredPlugin("qa", "qa.ts", "text/typescript", 12,
                time, time, "export default {}")));
        var result = runtime.list(3L);
        assertEquals("export default {}", result.getFirst().source());
        assertEquals(7, result.getFirst().getClass().getRecordComponents().length);
        verify(metadata).findByOrganizationIdOrderByIdAsc(41L);
        verify(objects).readPinned(row);
        verifyNoMoreInteractions(objects);
        if (permission != PermissionKey.VIEW_PLUGINS) {
            assertThrows(OrganizationAccessDeniedException.class, () -> authorization.require(3L, 41L, PermissionKey.VIEW_PLUGINS));
        }
    }

    @Test
    void aReviewerLoadsTheRenderersOfASnapshotOfTheirOrganization() {
        membership(PermissionKey.REVIEW);
        var time = OffsetDateTime.now();
        var pinned = List.of(new PluginRuntimeSourceDto("body", "body.ts", "text/typescript", 12, time, time,
                "export default {}"));
        when(snapshots.pinned(41L, 9L)).thenReturn(pinned);

        assertEquals(pinned, runtime.listPinned(3L, 9L));
    }

    @Test
    void organizationVisibilityAloneCannotLoadASnapshotsRenderers() {
        membership(PermissionKey.VIEW_ORGANIZATION);
        assertThrows(OrganizationAccessDeniedException.class, () -> runtime.listPinned(3L, 9L));
        verifyNoInteractions(snapshots);
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
