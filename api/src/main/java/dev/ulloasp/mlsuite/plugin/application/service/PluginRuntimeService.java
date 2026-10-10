package dev.ulloasp.mlsuite.plugin.application.service;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListPluginRuntimeSourcesUseCase;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginRuntimeSourceDto;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PluginRuntimeService implements ListPluginRuntimeSourcesUseCase {
    private final WorkspaceAccessService access;
    private final WorkspaceAuthorizationService authorization;
    private final PluginObjectReader objects;
    private final PluginMetadataRepository metadata;

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

    @Override
    @Transactional(readOnly = true)
    public List<PluginRuntimeSourceDto> listUsed(Long organizationId, Set<String> kinds) {
        if (kinds.isEmpty()) {
            return List.of();
        }
        return metadata.findByOrganizationIdAndKindInOrderByIdAsc(organizationId, kinds).stream()
                .map(objects::readPinned)
                .flatMap(Optional::stream)
                .map(PluginRuntimeSourceDto::from)
                .toList();
    }
}
