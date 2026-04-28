package dev.ulloasp.mlsuite.workspace.application.port.in;

import dev.ulloasp.mlsuite.workspace.application.dto.SelectOrganizationRequest;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspaceContextDto;

public interface WorkspaceContextUseCase {

    WorkspaceContextDto getContext(Long userId);

    WorkspaceContextDto selectOrganization(Long userId, SelectOrganizationRequest request);
}
