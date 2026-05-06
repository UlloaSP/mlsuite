package dev.ulloasp.mlsuite.role.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.role.application.dto.CreateRoleFromTemplateRequest;
import dev.ulloasp.mlsuite.role.application.dto.CreateRoleRequest;
import dev.ulloasp.mlsuite.role.application.dto.DuplicateRoleRequest;
import dev.ulloasp.mlsuite.role.application.dto.RoleDefinitionDto;
import dev.ulloasp.mlsuite.role.application.dto.RolesResponseDto;
import dev.ulloasp.mlsuite.role.application.port.in.RoleCatalogUseCase;
import dev.ulloasp.mlsuite.role.application.port.in.RoleManagementUseCase;
import dev.ulloasp.mlsuite.role.application.dto.UpdateRoleRequest;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/organizations/{organizationId}/roles")
public class RoleCatalogController {

    private final CurrentUserResolver currentUserResolver;
    private final RoleCatalogUseCase roleCatalogUseCase;
    private final RoleManagementUseCase roleManagementUseCase;

    public RoleCatalogController(
            CurrentUserResolver currentUserResolver,
            RoleCatalogUseCase roleCatalogUseCase,
            RoleManagementUseCase roleManagementUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.roleCatalogUseCase = roleCatalogUseCase;
        this.roleManagementUseCase = roleManagementUseCase;
    }

    @GetMapping
    ResponseEntity<RolesResponseDto> list(Authentication authentication, @PathVariable Long organizationId) {
        return ResponseEntity.ok(roleCatalogUseCase.list(
                currentUserResolver.resolve(authentication).userId(),
                organizationId));
    }

    @PostMapping
    ResponseEntity<RoleDefinitionDto> create(Authentication authentication, @PathVariable Long organizationId, @Valid @RequestBody CreateRoleRequest request) {
        return ResponseEntity.ok(roleManagementUseCase.create(currentUserResolver.resolve(authentication).userId(), organizationId, request));
    }

    @PostMapping("/from-template")
    ResponseEntity<RoleDefinitionDto> fromTemplate(Authentication authentication, @PathVariable Long organizationId, @Valid @RequestBody CreateRoleFromTemplateRequest request) {
        return ResponseEntity.ok(roleManagementUseCase.createFromTemplate(currentUserResolver.resolve(authentication).userId(), organizationId, request));
    }

    @PatchMapping("/{roleId}")
    ResponseEntity<RoleDefinitionDto> update(Authentication authentication, @PathVariable Long organizationId, @PathVariable Long roleId, @Valid @RequestBody UpdateRoleRequest request) {
        return ResponseEntity.ok(roleManagementUseCase.update(currentUserResolver.resolve(authentication).userId(), organizationId, roleId, request));
    }

    @PostMapping("/{roleId}/duplicate")
    ResponseEntity<RoleDefinitionDto> duplicate(Authentication authentication, @PathVariable Long organizationId, @PathVariable Long roleId, @Valid @RequestBody DuplicateRoleRequest request) {
        return ResponseEntity.ok(roleManagementUseCase.duplicate(currentUserResolver.resolve(authentication).userId(), organizationId, roleId, request));
    }

    @DeleteMapping("/{roleId}")
    ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long organizationId, @PathVariable Long roleId, @RequestParam(required = false) Long replacementRoleId) {
        roleManagementUseCase.delete(currentUserResolver.resolve(authentication).userId(), organizationId, roleId, replacementRoleId);
        return ResponseEntity.noContent().build();
    }
}
