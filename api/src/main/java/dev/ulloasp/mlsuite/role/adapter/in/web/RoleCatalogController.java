package dev.ulloasp.mlsuite.role.adapter.in.web;

import org.springframework.http.ResponseEntity;
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
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/organizations/{organizationId}/roles")
@RequiredArgsConstructor
public class RoleCatalogController {

    private final RoleCatalogUseCase roleCatalogUseCase;
    private final RoleManagementUseCase roleManagementUseCase;

    @GetMapping
    ResponseEntity<RolesResponseDto> list(CurrentUser user, @PathVariable Long organizationId) {
        return ResponseEntity.ok(roleCatalogUseCase.list(
                user.userId(),
                organizationId));
    }

    @PostMapping
    ResponseEntity<RoleDefinitionDto> create(CurrentUser user, @PathVariable Long organizationId, @Valid @RequestBody CreateRoleRequest request) {
        return ResponseEntity.ok(roleManagementUseCase.create(user.userId(), organizationId, request));
    }

    @PostMapping("/from-template")
    ResponseEntity<RoleDefinitionDto> fromTemplate(CurrentUser user, @PathVariable Long organizationId, @Valid @RequestBody CreateRoleFromTemplateRequest request) {
        return ResponseEntity.ok(roleManagementUseCase.createFromTemplate(user.userId(), organizationId, request));
    }

    @PatchMapping("/{roleId}")
    ResponseEntity<RoleDefinitionDto> update(CurrentUser user, @PathVariable Long organizationId, @PathVariable Long roleId, @Valid @RequestBody UpdateRoleRequest request) {
        return ResponseEntity.ok(roleManagementUseCase.update(user.userId(), organizationId, roleId, request));
    }

    @PostMapping("/{roleId}/duplicate")
    ResponseEntity<RoleDefinitionDto> duplicate(CurrentUser user, @PathVariable Long organizationId, @PathVariable Long roleId, @Valid @RequestBody DuplicateRoleRequest request) {
        return ResponseEntity.ok(roleManagementUseCase.duplicate(user.userId(), organizationId, roleId, request));
    }

    @DeleteMapping("/{roleId}")
    ResponseEntity<Void> delete(CurrentUser user, @PathVariable Long organizationId, @PathVariable Long roleId, @RequestParam(required = false) Long replacementRoleId) {
        roleManagementUseCase.delete(user.userId(), organizationId, roleId, replacementRoleId);
        return ResponseEntity.noContent().build();
    }
}
