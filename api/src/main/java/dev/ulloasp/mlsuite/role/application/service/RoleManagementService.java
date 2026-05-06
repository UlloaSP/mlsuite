package dev.ulloasp.mlsuite.role.application.service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleTemplateRepository;
import dev.ulloasp.mlsuite.role.application.dto.CreateRoleFromTemplateRequest;
import dev.ulloasp.mlsuite.role.application.dto.CreateRoleRequest;
import dev.ulloasp.mlsuite.role.application.dto.DuplicateRoleRequest;
import dev.ulloasp.mlsuite.role.application.dto.RoleDefinitionDto;
import dev.ulloasp.mlsuite.role.application.dto.UpdateRoleRequest;
import dev.ulloasp.mlsuite.role.application.port.in.RoleManagementUseCase;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@Service
@Transactional
public class RoleManagementService implements RoleManagementUseCase {

    private final WorkspaceAuthorizationService authorizationService;
    private final RoleCatalogService catalogService;
    private final RoleDefinitionRepository roleRepository;
    private final RoleTemplateRepository templateRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final UserLookupService userLookupService;
    private final AuditLogService auditLogService;

    public RoleManagementService(
            WorkspaceAuthorizationService authorizationService,
            RoleCatalogService catalogService,
            RoleDefinitionRepository roleRepository,
            RoleTemplateRepository templateRepository,
            OrganizationRepository organizationRepository,
            OrganizationMembershipRepository membershipRepository,
            UserLookupService userLookupService,
            AuditLogService auditLogService) {
        this.authorizationService = authorizationService;
        this.catalogService = catalogService;
        this.roleRepository = roleRepository;
        this.templateRepository = templateRepository;
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
        this.userLookupService = userLookupService;
        this.auditLogService = auditLogService;
    }

    @Override
    public RoleDefinitionDto create(Long userId, Long organizationId, CreateRoleRequest request) {
        requireManage(userId, organizationId);
        var org = organizationRepository.findById(organizationId).orElseThrow(() -> new OrganizationNotFoundException(organizationId));
        RoleDefinition role = new RoleDefinition(org, null, RoleScope.ORGANIZATION, request.name().strip(), uniqueSlug(organizationId, request.name()), null);
        role.setDescription(request.description());
        role.setCreatedBy(userLookupService.requireById(userId));
        role.setPermissions(parsePermissions(userId, organizationId, request.permissionKeys()));
        RoleDefinition saved = roleRepository.save(role);
        auditLogService.record(org, role.getCreatedBy(), "ROLE_CREATE", "ROLE", saved.getId().toString(), saved.getName());
        return catalogService.toDto(userId, organizationId, saved);
    }

    @Override
    public RoleDefinitionDto createFromTemplate(Long userId, Long organizationId, CreateRoleFromTemplateRequest request) {
        var template = templateRepository.findById(request.templateId()).orElseThrow(() -> new IllegalArgumentException("Role template does not exist."));
        var keys = request.permissionKeys() == null || request.permissionKeys().isEmpty()
                ? template.getPermissionKeys().stream().map(Enum::name).toList()
                : request.permissionKeys();
        var dto = create(userId, organizationId, new CreateRoleRequest(
                request.name() == null || request.name().isBlank() ? template.getName() : request.name(),
                template.getDescription(),
                keys));
        auditLogService.record(
                organizationRepository.findById(organizationId).orElseThrow(),
                userLookupService.requireById(userId),
                "ROLE_FROM_TEMPLATE",
                "ROLE",
                dto.id().toString(),
                template.getName());
        return dto;
    }

    @Override
    public RoleDefinitionDto update(Long userId, Long organizationId, Long roleId, UpdateRoleRequest request) {
        requireManage(userId, organizationId);
        RoleDefinition role = requireRole(organizationId, roleId);
        if (role.isLocked()) {
            throw new IllegalArgumentException("Locked role cannot be edited.");
        }
        role.setName(request.name().strip());
        role.setDescription(request.description());
        role.setPermissions(parsePermissions(userId, organizationId, request.permissionKeys()));
        auditLogService.record(role.getOrganization(), userLookupService.requireById(userId), "ROLE_UPDATE", "ROLE", roleId.toString(), role.getName());
        return catalogService.toDto(userId, organizationId, roleRepository.save(role));
    }

    @Override
    public RoleDefinitionDto duplicate(Long userId, Long organizationId, Long roleId, DuplicateRoleRequest request) {
        requireManage(userId, organizationId);
        RoleDefinition source = requireRole(organizationId, roleId);
        RoleDefinition copy = new RoleDefinition(source.getOrganization(), null, RoleScope.ORGANIZATION, request.name().strip(), uniqueSlug(organizationId, request.name()), null);
        copy.setDescription(source.getDescription());
        copy.setCreatedBy(userLookupService.requireById(userId));
        copy.setPermissions(new LinkedHashSet<>(source.getPermissions()));
        RoleDefinition saved = roleRepository.save(copy);
        auditLogService.record(source.getOrganization(), copy.getCreatedBy(), "ROLE_DUPLICATE", "ROLE", saved.getId().toString(), source.getName());
        return catalogService.toDto(userId, organizationId, saved);
    }

    @Override
    public void delete(Long userId, Long organizationId, Long roleId, Long replacementRoleId) {
        requireManage(userId, organizationId);
        RoleDefinition role = requireRole(organizationId, roleId);
        if (role.isLocked()) throw new IllegalArgumentException("Locked role cannot be deleted.");
        var assigned = membershipRepository.findByRoleDefinitionIdAndStatus(roleId, MembershipStatus.ACTIVE);
        if (!assigned.isEmpty()) {
            if (replacementRoleId == null || replacementRoleId.equals(roleId)) throw new IllegalArgumentException("Replacement role is required.");
            RoleDefinition replacement = requireRole(organizationId, replacementRoleId);
            assigned.forEach(membership -> membership.setRoleDefinition(replacement));
        }
        roleRepository.delete(role);
        auditLogService.record(role.getOrganization(), userLookupService.requireById(userId), "ROLE_DELETE", "ROLE", roleId.toString(), role.getName());
    }

    private void requireManage(Long userId, Long organizationId) {
        if (!authorizationService.workspacePermissions(userId, organizationId).canManageMemberRoles()) {
            throw new dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException(organizationId);
        }
    }

    private RoleDefinition requireRole(Long organizationId, Long roleId) {
        return roleRepository.findByIdAndOrganizationId(roleId, organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Role does not exist."));
    }

    private Set<PermissionKey> parsePermissions(Long userId, Long orgId, List<String> keys) {
        if (keys == null || keys.isEmpty()) throw new IllegalArgumentException("At least one permission is required.");
        Set<PermissionKey> parsed = new LinkedHashSet<>(keys.stream().map(PermissionKey::valueOf).toList());
        if (!authorizationService.workspacePermissions(userId, orgId).canTransferOwnership()) {
            parsed.remove(PermissionKey.TRANSFER_OWNERSHIP);
        }
        return parsed;
    }

    private String uniqueSlug(Long orgId, String name) {
        String base = name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        String slug = base.isBlank() ? "role" : base;
        int suffix = 2;
        while (roleRepository.existsByOrganizationIdAndScopeAndSlug(orgId, RoleScope.ORGANIZATION, slug)) {
            slug = base + "-" + suffix++;
        }
        return slug;
    }
}
