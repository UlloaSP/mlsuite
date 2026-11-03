package dev.ulloasp.mlsuite.role.application.service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
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
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class RoleManagementService implements RoleManagementUseCase {

    private static final String NO_ROLES = "A personal account has no roles to manage.";

    private final WorkspaceAuthorizationService authorizationService;
    private final RoleCatalogService catalogService;
    private final RoleDefinitionRepository roleRepository;
    private final RoleTemplateRepository templateRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final InvitationRepository invitationRepository;
    private final UserLookupService userLookupService;
    private final AuditLogService auditLogService;

    @Override
    public RoleDefinitionDto create(Long userId, Long organizationId, CreateRoleRequest request) {
        authorizationService.require(userId, organizationId, PermissionKey.MANAGE_MEMBER_ROLES);
        var org = organizationRepository.findById(organizationId).orElseThrow(() -> new OrganizationNotFoundException(organizationId));
        org.requireTeam(NO_ROLES);
        RoleDefinition role = new RoleDefinition(org, RoleScope.ORGANIZATION, request.name().strip(), uniqueSlug(organizationId, request.name()), null);
        role.setDescription(request.description());
        role.setCreatedBy(userLookupService.requireById(userId));
        role.setPermissions(parsePermissions(userId, organizationId, request.permissionKeys()));
        RoleDefinition saved = roleRepository.save(role);
        auditLogService.record(AuditActor.user(userId), organizationId, AuditAction.ROLE_CREATE, saved.getId(),
                AuditDetails.of("name", saved.getName(), "permissions", permissionNames(saved)));
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
        auditLogService.record(AuditActor.user(userId), organizationId, AuditAction.ROLE_FROM_TEMPLATE, dto.id(),
                AuditDetails.of("template", template.getName()));
        return dto;
    }

    @Override
    public RoleDefinitionDto update(Long userId, Long organizationId, Long roleId, UpdateRoleRequest request) {
        authorizationService.require(userId, organizationId, PermissionKey.MANAGE_MEMBER_ROLES);
        RoleDefinition role = requireRole(organizationId, roleId);
        if (role.isLocked()) {
            throw new IllegalArgumentException("Locked role cannot be edited.");
        }
        String previousName = role.getName();
        String previousPermissions = permissionNames(role);
        role.setName(request.name().strip());
        role.setDescription(request.description());
        role.setPermissions(parsePermissions(userId, organizationId, request.permissionKeys()));
        auditLogService.record(AuditActor.user(userId), organizationId, AuditAction.ROLE_UPDATE, roleId,
                AuditDetails.of("role", role.getName(), "name", AuditDetails.changed(previousName, role.getName()),
                        "permissions", AuditDetails.changed(previousPermissions, permissionNames(role))));
        return catalogService.toDto(userId, organizationId, roleRepository.save(role));
    }

    @Override
    public RoleDefinitionDto duplicate(Long userId, Long organizationId, Long roleId, DuplicateRoleRequest request) {
        authorizationService.require(userId, organizationId, PermissionKey.MANAGE_MEMBER_ROLES);
        RoleDefinition source = requireRole(organizationId, roleId);
        RoleDefinition copy = new RoleDefinition(source.getOrganization(), RoleScope.ORGANIZATION, request.name().strip(), uniqueSlug(organizationId, request.name()), null);
        copy.setDescription(source.getDescription());
        copy.setCreatedBy(userLookupService.requireById(userId));
        copy.setPermissions(new LinkedHashSet<>(source.getPermissions()));
        RoleDefinition saved = roleRepository.save(copy);
        auditLogService.record(AuditActor.user(userId), organizationId, AuditAction.ROLE_DUPLICATE, saved.getId(),
                AuditDetails.of("name", saved.getName(), "source", source.getName()));
        return catalogService.toDto(userId, organizationId, saved);
    }

    @Override
    public void delete(Long userId, Long organizationId, Long roleId, Long replacementRoleId) {
        authorizationService.require(userId, organizationId, PermissionKey.MANAGE_MEMBER_ROLES);
        RoleDefinition role = requireRole(organizationId, roleId);
        if (role.isLocked()) throw new IllegalArgumentException("Locked role cannot be deleted.");
        var assignedMemberships = membershipRepository.findByRoleDefinitionId(roleId);
        var assignedInvitations = invitationRepository.findByRoleDefinitionId(roleId);
        if (!assignedMemberships.isEmpty() || !assignedInvitations.isEmpty()) {
            if (replacementRoleId == null || replacementRoleId.equals(roleId)) throw new IllegalArgumentException("Replacement role is required.");
            RoleDefinition replacement = requireRole(organizationId, replacementRoleId);
            assignedMemberships.forEach(membership -> membership.setRoleDefinition(replacement));
            assignedInvitations.forEach(invitation -> invitation.setRoleDefinition(replacement));
        }
        roleRepository.delete(role);
        auditLogService.record(AuditActor.user(userId), organizationId, AuditAction.ROLE_DELETE, roleId,
                AuditDetails.of("name", role.getName()));
    }

    private static String permissionNames(RoleDefinition role) {
        return role.getPermissions().stream().map(Enum::name).sorted().collect(Collectors.joining(", "));
    }

    private RoleDefinition requireRole(Long organizationId, Long roleId) {
        RoleDefinition role = roleRepository.findByIdAndOrganizationId(roleId, organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Role does not exist."));
        role.getOrganization().requireTeam(NO_ROLES);
        return role;
    }

    private Set<PermissionKey> parsePermissions(Long userId, Long orgId, List<String> keys) {
        if (keys == null || keys.isEmpty()) throw new IllegalArgumentException("At least one permission is required.");
        Set<PermissionKey> parsed = new LinkedHashSet<>(keys.stream().map(PermissionKey::valueOf).toList());
        if (!authorizationService.has(userId, orgId, PermissionKey.TRANSFER_OWNERSHIP)) {
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
