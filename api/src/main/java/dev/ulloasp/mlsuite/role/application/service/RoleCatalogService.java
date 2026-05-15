package dev.ulloasp.mlsuite.role.application.service;

import java.util.Arrays;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleTemplateRepository;
import dev.ulloasp.mlsuite.role.application.dto.PermissionDto;
import dev.ulloasp.mlsuite.role.application.dto.PermissionGroupDto;
import dev.ulloasp.mlsuite.role.application.dto.RoleActionsDto;
import dev.ulloasp.mlsuite.role.application.dto.RoleDefinitionDto;
import dev.ulloasp.mlsuite.role.application.dto.RoleStatsDto;
import dev.ulloasp.mlsuite.role.application.dto.RoleTemplateDto;
import dev.ulloasp.mlsuite.role.application.dto.RolesResponseDto;
import dev.ulloasp.mlsuite.role.application.port.in.RoleCatalogUseCase;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.role.domain.model.RoleTemplate;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@Service
@Transactional(readOnly = true)
public class RoleCatalogService implements RoleCatalogUseCase {

    private final WorkspaceAuthorizationService authorizationService;
    private final OrganizationRepository organizationRepository;
    private final RoleSeedService roleSeedService;
    private final RoleDefinitionRepository roleRepository;
    private final RoleTemplateRepository templateRepository;
    private final OrganizationMembershipRepository membershipRepository;

    public RoleCatalogService(
            WorkspaceAuthorizationService authorizationService,
            OrganizationRepository organizationRepository,
            RoleSeedService roleSeedService,
            RoleDefinitionRepository roleRepository,
            RoleTemplateRepository templateRepository,
            OrganizationMembershipRepository membershipRepository) {
        this.authorizationService = authorizationService;
        this.organizationRepository = organizationRepository;
        this.roleSeedService = roleSeedService;
        this.roleRepository = roleRepository;
        this.templateRepository = templateRepository;
        this.membershipRepository = membershipRepository;
    }

    @Override
    public RolesResponseDto list(Long userId, Long organizationId) {
        authorizationService.requireOrganizationRead(userId, organizationId);
        roleSeedService.ensureOrganizationRoles(organizationRepository.findById(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId)));
        var roles = roleRepository.findByOrganizationIdAndScopeOrderByLockedDescNameAsc(organizationId, RoleScope.ORGANIZATION)
                .stream()
                .map(role -> toDto(userId, organizationId, role))
                .toList();
        return new RolesResponseDto(roles, templates(), catalog(), stats(roles));
    }

    public List<PermissionGroupDto> catalog() {
        return List.of(
                group("Organization", "VIEW_WORKSPACE", "VIEW_ORGANIZATION", "EDIT_ORGANIZATION", "DELETE_ORGANIZATION", "TRANSFER_OWNERSHIP"),
                group("Members", "VIEW_MEMBERS", "INVITE_MEMBERS", "MANAGE_MEMBER_ROLES", "REMOVE_MEMBERS"),
                group("Invitations", "VIEW_INVITATIONS", "MANAGE_INVITATIONS"),
                group("Teams", "VIEW_TEAMS", "CREATE_TEAMS", "EDIT_TEAMS", "DELETE_TEAMS"),
                group("Models", "VIEW_MODELS", "CREATE_MODELS", "EDIT_MODELS", "DELETE_MODELS", "RUN_PREDICTIONS", "MANAGE_REVIEW_LINKS"),
                group("Plugins", "VIEW_PLUGINS", "MANAGE_PLUGINS"),
                group("Audit", "VIEW_AUDIT_LOG"));
    }

    public PermissionDto permission(PermissionKey key) {
        String label = key.name().replace('_', ' ').toLowerCase();
        boolean dangerous = key.name().contains("DELETE") || key.name().contains("TRANSFER") || key.name().contains("REMOVE");
        return new PermissionDto(key.name(), label, "Allows " + label + ".", dangerous);
    }

    public RoleDefinitionDto toDto(Long userId, Long orgId, RoleDefinition role) {
        boolean canManage = authorizationService.workspacePermissions(userId, orgId).canManageMemberRoles();
        long users = membershipRepository.countByRoleDefinitionIdAndStatus(role.getId(), MembershipStatus.ACTIVE);
        return new RoleDefinitionDto(
                role.getId(),
                role.getName(),
                role.getSlug(),
                role.getDescription(),
                role.getScope().name(),
                role.isLocked(),
                role.getSystemKey(),
                users,
                role.getPermissions().stream().map(this::permission).toList(),
                new RoleActionsDto(true, canManage && !role.isLocked(), canManage, canManage, canManage));
    }

    private List<RoleTemplateDto> templates() {
        return templateRepository.findByScopeOrderByNameAsc(RoleScope.ORGANIZATION).stream()
                .map(this::template)
                .toList();
    }

    private RoleTemplateDto template(RoleTemplate template) {
        return new RoleTemplateDto(
                template.getId(),
                template.getName(),
                template.getDescription(),
                template.getCategory(),
                template.getScope().name(),
                template.getPermissionKeys().stream().map(Enum::name).toList());
    }

    private PermissionGroupDto group(String name, String... keys) {
        return new PermissionGroupDto(name, Arrays.stream(keys).map(PermissionKey::valueOf).map(this::permission).toList());
    }

    private RoleStatsDto stats(List<RoleDefinitionDto> roles) {
        return new RoleStatsDto(
                roles.stream().filter(role -> !role.locked()).count(),
                roles.stream().filter(RoleDefinitionDto::locked).count(),
                roles.stream().mapToLong(RoleDefinitionDto::userCount).sum());
    }
}
