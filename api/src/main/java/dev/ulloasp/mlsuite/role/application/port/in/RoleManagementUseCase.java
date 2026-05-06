package dev.ulloasp.mlsuite.role.application.port.in;

import dev.ulloasp.mlsuite.role.application.dto.CreateRoleFromTemplateRequest;
import dev.ulloasp.mlsuite.role.application.dto.CreateRoleRequest;
import dev.ulloasp.mlsuite.role.application.dto.DuplicateRoleRequest;
import dev.ulloasp.mlsuite.role.application.dto.RoleDefinitionDto;
import dev.ulloasp.mlsuite.role.application.dto.UpdateRoleRequest;

public interface RoleManagementUseCase {

    RoleDefinitionDto create(Long userId, Long organizationId, CreateRoleRequest request);

    RoleDefinitionDto createFromTemplate(Long userId, Long organizationId, CreateRoleFromTemplateRequest request);

    RoleDefinitionDto update(Long userId, Long organizationId, Long roleId, UpdateRoleRequest request);

    RoleDefinitionDto duplicate(Long userId, Long organizationId, Long roleId, DuplicateRoleRequest request);

    void delete(Long userId, Long organizationId, Long roleId, Long replacementRoleId);
}
