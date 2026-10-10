package dev.ulloasp.mlsuite.role.adapter.in.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.role.application.dto.PermissionGroupDto;
import dev.ulloasp.mlsuite.role.application.dto.RoleCatalogMetadataDto;
import dev.ulloasp.mlsuite.role.application.dto.RoleDefinitionDto;
import dev.ulloasp.mlsuite.role.application.dto.RoleTemplateDto;
import dev.ulloasp.mlsuite.role.application.port.in.RoleListCatalogUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class RoleListCatalogController {
    private final RoleListCatalogUseCase roles;

    @GetMapping("/api/organizations/{organizationId}/roles/metadata")
    public RoleCatalogMetadataDto roleCatalogMetadata(CurrentUser user, @PathVariable Long organizationId) {
        return roles.metadata(user.userId(), organizationId);
    }

    @GetMapping("/api/organizations/{organizationId}/roles/catalog")
    public PageDto<RoleDefinitionDto> roleCatalog(CurrentUser user, @PathVariable Long organizationId,
            @ModelAttribute CatalogRequest request) {
        return roles.roles(user.userId(), organizationId, request);
    }

    @GetMapping("/api/organizations/{organizationId}/role-templates/catalog")
    public PageDto<RoleTemplateDto> roleTemplateCatalog(CurrentUser user, @PathVariable Long organizationId,
            @ModelAttribute CatalogRequest request) {
        return roles.templates(user.userId(), organizationId, request);
    }

    @GetMapping("/api/organizations/{organizationId}/permissions/catalog")
    public PageDto<PermissionGroupDto> permissionCatalog(CurrentUser user, @PathVariable Long organizationId,
            @ModelAttribute CatalogRequest request) {
        return roles.permissions(user.userId(), organizationId, request);
    }
}
