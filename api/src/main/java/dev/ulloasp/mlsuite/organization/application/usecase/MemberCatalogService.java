package dev.ulloasp.mlsuite.organization.application.usecase;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.application.dto.MemberCatalogDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipRowDto;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.workspace.application.dto.MembershipActionsDto;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspacePermissionsDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;

/** Members of one organization, paged and searched in the database. */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MemberCatalogService {
    private static final MembershipActionsDto NO_ACTIONS = new MembershipActionsDto(false, false, List.of());

    private final WorkspaceAuthorizationService authorization;
    private final OrganizationMembershipRepository memberships;
    private final RoleDefinitionRepository definitions;

    /** Only roles held by active members, across the full organization and independently of member pages. */
    public PageDto<RoleSummaryDto> filterRoles(Long userId, Long organizationId, CatalogRequest request) {
        viewing(userId, organizationId);
        Specification<RoleDefinition> used = (root, query, builder) -> {
            var active = query.subquery(Long.class);
            var member = active.from(OrganizationMembership.class);
            active.select(member.get("id")).where(
                    builder.equal(member.get("roleDefinition"), root),
                    builder.equal(member.get("status"), MembershipStatus.ACTIVE));
            var id = request.filter().equalsIgnoreCase("all") ? builder.conjunction()
                    : builder.equal(root.get("id"), roleId(request.filter()));
            return builder.and(builder.equal(root.get("organization").get("id"), organizationId),
                    builder.exists(active), id,
                    builder.like(builder.lower(root.get("name")), CatalogPages.likeLiteral(request.search()), '!'));
        };
        var page = definitions.findAll(used, CatalogPages.pageable(request,
                Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.asc("id"))));
        return PageDto.of(page, page.getContent().stream().map(RoleSummaryDto::from).toList());
    }

    /** {@code filter} is a role id; each row says what the caller may do, without the roles to choose from. */
    public MemberCatalogDto list(Long userId, Long organizationId, CatalogRequest request) {
        WorkspacePermissionsDto permissions = viewing(userId, organizationId);
        Page<OrganizationMembership> page = memberships.findAll(activeMembers(organizationId, request, false),
                CatalogPages.pageable(request, Sort.by("createdAt", "id")));
        List<OrganizationMembershipRowDto> items = page.getContent().stream()
                .map(member -> OrganizationMembershipRowDto.from(member,
                        authorization.organizationMemberActionFlags(userId, permissions, member)))
                .toList();
        return new MemberCatalogDto(items, page.getNumber(), page.getSize(), page.getTotalElements(),
                page.hasNext(), memberships.countActiveByOrganizationId(organizationId));
    }

    /** Members ownership can be transferred to: it shows who the members are, so it needs both permissions. */
    public PageDto<OrganizationMembershipRowDto> ownerCandidates(Long userId, Long organizationId,
            CatalogRequest request) {
        if (!viewing(userId, organizationId).canTransferOwnership()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
        Page<OrganizationMembership> page = memberships.findAll(activeMembers(organizationId, request, true),
                CatalogPages.pageable(request, Sort.by("user.fullName", "id")));
        return PageDto.of(page, page.getContent().stream()
                .map(member -> OrganizationMembershipRowDto.from(member, NO_ACTIONS))
                .toList());
    }

    /** The roles the caller may give one member: every role of the organization but the owner's. */
    public PageDto<RoleSummaryDto> assignableRoles(Long userId, Long organizationId, Long membershipId,
            CatalogRequest request) {
        WorkspacePermissionsDto permissions = viewing(userId, organizationId);
        OrganizationMembership member = memberships.findActiveByIdAndOrganizationId(membershipId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!authorization.organizationMemberActionFlags(userId, permissions, member).canChangeRole()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        Specification<RoleDefinition> assignable = (root, query, builder) -> builder.and(
                builder.equal(root.get("organization").get("id"), organizationId),
                builder.equal(root.get("scope"), RoleScope.ORGANIZATION),
                notOwner(builder, root.get("systemKey")),
                builder.like(builder.lower(root.get("name")), CatalogPages.likeLiteral(request.search()), '!'));
        Page<RoleDefinition> page = definitions.findAll(assignable,
                CatalogPages.pageable(request, Sort.by("name", "id")));
        return PageDto.of(page, page.getContent().stream().map(RoleSummaryDto::from).toList());
    }

    private WorkspacePermissionsDto viewing(Long userId, Long organizationId) {
        WorkspacePermissionsDto permissions = authorization.workspacePermissions(userId, organizationId);
        if (!permissions.canViewMembers()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
        return permissions;
    }

    private Specification<OrganizationMembership> activeMembers(Long organizationId, CatalogRequest request,
            boolean ownerCandidates) {
        return (root, query, builder) -> {
            String search = CatalogPages.likeLiteral(request.search());
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.equal(root.get("organization").get("id"), organizationId));
            predicates.add(builder.equal(root.get("status"), MembershipStatus.ACTIVE));
            predicates.add(builder.or(
                    builder.like(builder.lower(root.get("user").get("fullName")), search, '!'),
                    builder.like(builder.lower(root.get("user").get("email")), search, '!')));
            if (ownerCandidates) {
                predicates.add(notOwner(builder, root.get("roleDefinition").get("systemKey")));
            } else if (!request.filter().equalsIgnoreCase("all")) {
                predicates.add(builder.equal(root.get("roleDefinition").get("id"), roleId(request.filter())));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Predicate notOwner(CriteriaBuilder builder, Path<String> systemKey) {
        return builder.or(builder.isNull(systemKey), builder.notEqual(systemKey, OrganizationRole.OWNER.name()));
    }

    /** A filter that is not a role id matches no member. */
    private Long roleId(String value) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ignored) {
            return -1L;
        }
    }
}
