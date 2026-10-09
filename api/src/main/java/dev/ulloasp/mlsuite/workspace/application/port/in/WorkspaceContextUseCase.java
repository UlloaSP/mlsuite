package dev.ulloasp.mlsuite.workspace.application.port.in;

import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.workspace.application.dto.SelectOrganizationRequest;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspaceContextDto;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspaceCurrentContextDto;

public interface WorkspaceContextUseCase {

    WorkspaceContextDto getContext(Long userId);

    WorkspaceContextDto selectOrganization(Long userId, SelectOrganizationRequest request);

    /** The context without the lists of every membership and organization, which a catalog pages. */
    WorkspaceCurrentContextDto getCurrentContext(Long userId);

    WorkspaceCurrentContextDto selectCurrentOrganization(Long userId, SelectOrganizationRequest request);

    /** The organizations the user may switch to, searched by name or slug. */
    PageDto<OrganizationDto> organizations(Long userId, CatalogRequest request);
}
