package dev.ulloasp.mlsuite.organization.application.usecase;

import java.util.List;
import java.util.Optional;

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
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.CatalogValues;
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
        Optional<Long> role = roleFilter(organizationId, request.requireOneOrder().filter());
        Specification<RoleDefinition> used = (root, query, builder) -> {
            var active = query.subquery(Long.class);
            var member = active.from(OrganizationMembership.class);
            active.select(member.get("id")).where(
                    builder.equal(member.get("roleDefinition"), root),
                    builder.equal(member.get("status"), MembershipStatus.ACTIVE));
            var id = role.map(value -> builder.equal(root.get("id"), value)).orElseGet(builder::conjunction);
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
        Optional<Long> role = roleFilter(organizationId, request.requireOneOrder().filter());
        Specification<OrganizationMembership> ofRole = (root, query, builder) -> role
                .map(id -> builder.equal(root.get("roleDefinition").get("id"), id))
                .orElseGet(builder::conjunction);
        Page<OrganizationMembership> page = memberships.findAll(activeMembers(organizationId, request).and(ofRole),
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
        request.requireNoChoices();
        Specification<OrganizationMembership> notOwners = (root, query, builder) ->
                notOwner(builder, root.get("roleDefinition").get("systemKey"));
        Page<OrganizationMembership> page = memberships.findAll(activeMembers(organizationId, request).and(notOwners),
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
        request.requireNoChoices();
        Specification<RoleDefinition> assignable = (root, query, builder) -> builder.and(
                builder.equal(root.get("organization").get("id"), organizationId),
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

    private Specification<OrganizationMembership> activeMembers(Long organizationId, CatalogRequest request) {
        return (root, query, builder) -> {
            String search = CatalogPages.likeLiteral(request.search());
            return builder.and(
                    builder.equal(root.get("organization").get("id"), organizationId),
                    builder.equal(root.get("status"), MembershipStatus.ACTIVE),
                    builder.or(
                            builder.like(builder.lower(root.get("user").get("fullName")), search, '!'),
                            builder.like(builder.lower(root.get("user").get("email")), search, '!')));
        };
    }

    private Predicate notOwner(CriteriaBuilder builder, Path<String> systemKey) {
        return builder.or(builder.isNull(systemKey), builder.notEqual(systemKey, OrganizationRole.OWNER.name()));
    }

    /** {@code filter} is "all", in any case, or the id of one of the organization's roles. */
    private Optional<Long> roleFilter(Long organizationId, String filter) {
        if (filter.equalsIgnoreCase("all")) {
            return Optional.empty();
        }
        try {
            Long id = Long.valueOf(filter);
            if (definitions.findByIdAndOrganizationId(id, organizationId).isPresent()) {
                return Optional.of(id);
            }
        } catch (NumberFormatException notAnId) {
            // Refused below, like an id that names no role here.
        }
        throw CatalogValues.unknown("filter", filter, List.of("all", "<role id>"));
    }
}
