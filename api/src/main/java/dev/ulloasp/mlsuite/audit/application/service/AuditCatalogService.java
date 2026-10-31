package dev.ulloasp.mlsuite.audit.application.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.audit.adapter.out.persistence.repository.AuditEventRepository;
import dev.ulloasp.mlsuite.audit.application.dto.AuditEventDto;
import dev.ulloasp.mlsuite.audit.application.dto.AuditFilters;
import dev.ulloasp.mlsuite.audit.application.port.in.AuditLogUseCase;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditEvent;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;

/**
 * Pages the audit log back, newest first: an organization's to the members who may read it, and
 * all of it to the platform's administrators. Platform actions on an organization's resources
 * (moderation, client suspension, call limits) are in that organization's log, under the
 * superadmin who took them. {@code filter} is an action code or {@code all}.
 */
@Service
@RequiredArgsConstructor
public class AuditCatalogService implements AuditLogUseCase {

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
    private static final String PLATFORM = "platform";

    private final AuditEventRepository events;
    private final WorkspaceAuthorizationService authorizationService;

    @Override
    @Transactional(readOnly = true)
    public PageDto<AuditEventDto> list(Long userId, Long organizationId, CatalogRequest request, AuditFilters filters) {
        authorizationService.require(userId, organizationId, PermissionKey.VIEW_AUDIT_LOG);
        Specification<AuditEvent> own = (root, query, builder) -> builder.equal(root.get("organizationId"), organizationId);
        Page<AuditEvent> page = events.findAll(own.and(matching(request, filters)), pageable(request));
        return PageDto.of(page, page.getContent().stream().map(AuditEventDto::forOrganization).toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PageDto<AuditEventDto> listPlatform(CatalogRequest request, AuditFilters filters, String organization) {
        Page<AuditEvent> page = events.findAll(scope(organization).and(matching(request, filters)), pageable(request));
        return PageDto.of(page, page.getContent().stream().map(AuditEventDto::from).toList());
    }

    private static Pageable pageable(CatalogRequest request) {
        return CatalogPages.pageable(request, NEWEST_FIRST);
    }

    private static Specification<AuditEvent> scope(String organization) {
        if (organization == null || organization.isBlank()) return (root, query, builder) -> builder.conjunction();
        if (PLATFORM.equals(organization)) {
            return (root, query, builder) -> builder.isNull(root.get("organizationId"));
        }
        try {
            long id = Long.parseLong(organization);
            return (root, query, builder) -> builder.equal(root.get("organizationId"), id);
        } catch (NumberFormatException notAnId) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown organization filter.");
        }
    }

    private static Specification<AuditEvent> matching(CatalogRequest request, AuditFilters filters) {
        AuditAction action = action(request.filter());
        String search = CatalogPages.likeLiteral(request.search());
        String actor = filters.actor() == null ? "" : filters.actor().strip();
        return (root, query, builder) -> {
            List<Predicate> all = new ArrayList<>();
            if (action != null) all.add(builder.equal(root.get("action"), action));
            if (filters.from() != null) all.add(builder.greaterThanOrEqualTo(root.get("createdAt"), filters.from()));
            if (filters.to() != null) all.add(builder.lessThan(root.get("createdAt"), filters.to()));
            if (filters.actorKind() != null) all.add(builder.equal(root.get("actorKind"), filters.actorKind()));
            if (filters.targetType() != null) all.add(builder.equal(root.get("targetType"), filters.targetType()));
            if (!actor.isEmpty()) all.add(like(builder, root.get("actorLabel"), CatalogPages.likeLiteral(actor)));
            if (!request.search().isEmpty()) all.add(searched(root, builder, search));
            return builder.and(all.toArray(Predicate[]::new));
        };
    }

    /** The search reads what a row shows: who, which organization, the target and the details. */
    private static Predicate searched(Root<AuditEvent> root, CriteriaBuilder builder, String search) {
        return builder.or(
                like(builder, root.get("actorLabel"), search),
                like(builder, root.get("organizationLabel"), search),
                like(builder, root.get("targetId"), search),
                like(builder, builder.function("jsonb_pretty", String.class, root.get("metadata")), search));
    }

    private static Predicate like(CriteriaBuilder builder, Expression<String> value, String pattern) {
        return builder.like(builder.lower(builder.coalesce(value, "")), pattern, '!');
    }

    private static AuditAction action(String filter) {
        if ("all".equalsIgnoreCase(filter)) return null;
        try {
            return AuditAction.valueOf(filter.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException unknown) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown audit action.");
        }
    }
}
