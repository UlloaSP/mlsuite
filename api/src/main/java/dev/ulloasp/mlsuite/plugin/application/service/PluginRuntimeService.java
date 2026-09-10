package dev.ulloasp.mlsuite.plugin.application.service;

import java.util.List;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListPluginRuntimeSourcesUseCase;
import org.springframework.stereotype.Service;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginRuntimeSourceDto;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@Service
public class PluginRuntimeService implements ListPluginRuntimeSourcesUseCase {
    private final WorkspaceAccessService access;
    private final WorkspaceAuthorizationService authorization;
    private final PluginObjectReader objects;

    public PluginRuntimeService(WorkspaceAccessService access, WorkspaceAuthorizationService authorization,
            PluginObjectReader objects) {
        this.access = access;
        this.authorization = authorization;
        this.objects = objects;
    }

    @Override
    public List<PluginRuntimeSourceDto> list(Long userId) {
        Long organizationId = access.requireCurrentOrganization(userId).getId();
        var permissions = authorization.workspacePermissions(userId, organizationId);
        if (!permissions.canViewModels() && !permissions.canRunPredictions() && !permissions.canReview()
                && !permissions.canManageReviews() && !permissions.canViewPlugins()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
        return objects.list(organizationId).stream().map(PluginRuntimeSourceDto::from).toList();
    }
}
