package dev.ulloasp.mlsuite.role.application.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository.RoleMemberCount;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.dto.PermissionGroupDto;
import dev.ulloasp.mlsuite.role.application.dto.RoleCatalogMetadataDto;
import dev.ulloasp.mlsuite.role.application.dto.RoleDefinitionDto;
import dev.ulloasp.mlsuite.role.application.dto.RoleTemplateDto;
import dev.ulloasp.mlsuite.role.application.port.in.RoleListCatalogUseCase;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspacePermissionsDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;

/**
 * An organization's roles one page at a time. Roles are paged in the database and their member
 * counts read together; role templates and permission groups are small, fixed sets paged in memory.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class RoleListCatalogService implements RoleListCatalogUseCase {
    private static final Sort LOCKED_FIRST_BY_NAME = Sort.by(
            Sort.Order.desc("locked"), Sort.Order.asc("name").ignoreCase(), Sort.Order.asc("id"));

    private final RoleCatalogService catalog;
    private final WorkspaceAuthorizationService authorization;
    private final RoleDefinitionRepository roleRepository;
    private final OrganizationMembershipRepository membershipRepository;

    @Override
    public RoleCatalogMetadataDto metadata(Long userId, Long organizationId) {
        catalog.requireReadable(userId, organizationId);
        return new RoleCatalogMetadataDto(
                roleRepository.countByOrganizationIdAndScope(organizationId, RoleScope.ORGANIZATION),
                catalog.templates().size(),
                catalog.catalog());
    }

    /** {@code filter=invitable} leaves the owner role out unless the caller may transfer ownership. */
    @Override
    public PageDto<RoleDefinitionDto> roles(Long userId, Long organizationId, CatalogRequest request) {
        catalog.requireReadable(userId, organizationId);
        WorkspacePermissionsDto permissions = authorization.workspacePermissions(userId, organizationId);
        boolean withoutOwner = request.filter().equals("invitable") && !permissions.canTransferOwnership();
        Page<RoleDefinition> page = roleRepository.findAll(
                matching(organizationId, request.search(), withoutOwner),
                CatalogPages.pageable(request, LOCKED_FIRST_BY_NAME));
        Map<Long, Long> members = memberCounts(page.getContent());
        return PageDto.of(page, page.getContent().stream()
                .map(role -> catalog.toDto(role, permissions.canManageMemberRoles(),
                        members.getOrDefault(role.getId(), 0L)))
                .toList());
    }

    @Override
    public PageDto<RoleTemplateDto> templates(Long userId, Long organizationId, CatalogRequest request) {
        catalog.requireReadable(userId, organizationId);
        return CatalogPages.of(catalog.templates(), request,
                item -> CatalogPages.contains(request.search(), item.name(), item.description()),
                Comparator.comparing(RoleTemplateDto::name, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(RoleTemplateDto::id));
    }

    /** A group keeps the permissions that match the search, and is left out when none does. */
    @Override
    public PageDto<PermissionGroupDto> permissions(Long userId, Long organizationId, CatalogRequest request) {
        catalog.requireReadable(userId, organizationId);
        List<PermissionGroupDto> groups = catalog.catalog().stream()
                .map(group -> new PermissionGroupDto(group.name(), group.permissions().stream()
                        .filter(item -> CatalogPages.contains(request.search(), group.name(), item.label(),
                                item.description()))
                        .toList()))
                .filter(group -> !group.permissions().isEmpty())
                .toList();
        return CatalogPages.page(groups, request);
    }

    private Specification<RoleDefinition> matching(Long organizationId, String search, boolean withoutOwner) {
        return (root, query, builder) -> {
            String pattern = CatalogPages.likeLiteral(search);
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.equal(root.get("organization").get("id"), organizationId));
            predicates.add(builder.equal(root.get("scope"), RoleScope.ORGANIZATION));
            predicates.add(builder.or(
                    builder.like(builder.lower(root.get("name")), pattern, '!'),
                    builder.like(builder.lower(root.get("description")), pattern, '!')));
            if (withoutOwner) {
                predicates.add(builder.or(
                        builder.isNull(root.get("systemKey")),
                        builder.notEqual(root.get("systemKey"), OrganizationRole.OWNER.name())));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Map<Long, Long> memberCounts(List<RoleDefinition> roles) {
        if (roles.isEmpty()) {
            return Map.of();
        }
        List<Long> roleIds = roles.stream().map(RoleDefinition::getId).toList();
        return membershipRepository.countActiveByRoleDefinitionIds(roleIds).stream()
                .collect(Collectors.toMap(RoleMemberCount::getRoleId, RoleMemberCount::getMembers));
    }
}
