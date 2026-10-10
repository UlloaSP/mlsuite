package dev.ulloasp.mlsuite.schema.catalog;

import java.util.List;

import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;

/** Eligible reviewer projections, without loading memberships or checking each user's permissions separately. */
@Component
@RequiredArgsConstructor
class ReviewerSelectionCatalogQueries {
    private static final String ELIGIBLE = """
            FROM OrganizationMembership m JOIN m.user reviewer
            WHERE m.organization.id = :org
            AND m.status = dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus.ACTIVE
            AND reviewer.enabled = true
            AND (reviewer.systemRole = dev.ulloasp.mlsuite.user.domain.model.SystemRole.SUPERADMIN
                OR dev.ulloasp.mlsuite.role.domain.model.PermissionKey.REVIEW MEMBER OF m.roleDefinition.permissions)
            """;
    private static final String MATCHING = ELIGIBLE + """
            AND (lower(reviewer.fullName) LIKE :search ESCAPE '!'
                OR lower(reviewer.email) LIKE :search ESCAPE '!')
            """;
    private static final String ORDER = " ORDER BY lower(reviewer.fullName) ASC, reviewer.id ASC";
    private final EntityManager entities;

    CatalogSelectionPageDto page(Long org, CatalogRequest request) {
        long available = (Long) entities.createQuery("SELECT COUNT(m) " + ELIGIBLE)
                .setParameter("org", org).getSingleResult();
        long total = (Long) bind(entities.createQuery("SELECT COUNT(m) " + MATCHING), org, request)
                .getSingleResult();
        long offset = (long) request.page() * request.size();
        List<CatalogSelectionItemDto> items = List.of();
        if (offset < total && offset <= Integer.MAX_VALUE) {
            var query = entities.createQuery("""
                    SELECT new dev.ulloasp.mlsuite.schema.catalog.CatalogSelectionItemDto(
                        str(reviewer.id), reviewer.fullName, reviewer.email)
                    """ + MATCHING + ORDER, CatalogSelectionItemDto.class);
            bind(query, org, request).setFirstResult((int) offset).setMaxResults(request.size());
            items = query.getResultList();
        }
        return new CatalogSelectionPageDto(items, request.page(), request.size(), total,
                offset + request.size() < total, available);
    }

    List<String> ids(Long org, CatalogRequest request) {
        var query = entities.createQuery("SELECT str(reviewer.id) " + MATCHING + ORDER, String.class);
        bind(query, org, request);
        return query.getResultList();
    }

    private Query bind(Query query, Long org, CatalogRequest request) {
        return query.setParameter("org", org).setParameter("search", CatalogPages.likeLiteral(request.search()));
    }
}
