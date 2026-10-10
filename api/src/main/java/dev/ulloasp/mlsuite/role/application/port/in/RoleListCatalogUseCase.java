package dev.ulloasp.mlsuite.role.application.port.in;

import dev.ulloasp.mlsuite.role.application.dto.PermissionGroupDto;
import dev.ulloasp.mlsuite.role.application.dto.RoleCatalogMetadataDto;
import dev.ulloasp.mlsuite.role.application.dto.RoleDefinitionDto;
import dev.ulloasp.mlsuite.role.application.dto.RoleTemplateDto;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;

public interface RoleListCatalogUseCase {

    RoleCatalogMetadataDto metadata(Long userId, Long organizationId);

    PageDto<RoleDefinitionDto> roles(Long userId, Long organizationId, CatalogRequest request);

    PageDto<RoleTemplateDto> templates(Long userId, Long organizationId, CatalogRequest request);

    PageDto<PermissionGroupDto> permissions(Long userId, Long organizationId, CatalogRequest request);
}
