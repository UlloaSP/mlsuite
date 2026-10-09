package dev.ulloasp.mlsuite.schema.catalog;

import java.util.ArrayList;
import java.util.List;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

/**
 * The filters the database decides: which runs of an organization a read may touch. Every catalog
 * read builds its predicate here, so a page, a scan and the filter choices cannot disagree about scope.
 */
record InferenceCatalogScope(String schemaId, String bookmarkId, String status, String origin) {

    private static final String ALL = "all";
    private static final String UNBOOKMARKED = "unbookmarked";

    /** Every stored filter of a request: the runs its rows come from. */
    static InferenceCatalogScope rows(InferenceCatalogRequest request) {
        return new InferenceCatalogScope(
                request.schemaId(), request.bookmarkId(), request.status(), request.origin());
    }

    /** The chosen schema and bookmark alone: the runs that decide the table's data columns. */
    static InferenceCatalogScope columns(InferenceCatalogRequest request) {
        return new InferenceCatalogScope(request.schemaId(), request.bookmarkId(), ALL, ALL);
    }

    /** The chosen schema alone: the runs whose bookmarks a filter can offer. */
    static InferenceCatalogScope bookmarks(InferenceCatalogRequest request) {
        return new InferenceCatalogScope(request.schemaId(), ALL, ALL, ALL);
    }

    static InferenceCatalogScope organization() {
        return new InferenceCatalogScope(ALL, ALL, ALL, ALL);
    }

    Predicate within(Long organizationId, Root<PredictionRun> run, CriteriaBuilder builder) {
        Path<Object> schema = run.get("schemaVersion").get("schema");
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(builder.equal(schema.get("organization").get("id"), organizationId));
        if (!ALL.equals(schemaId)) {
            predicates.add(builder.equal(schema.get("id"), id(schemaId)));
        }
        if (UNBOOKMARKED.equals(bookmarkId)) {
            predicates.add(builder.isNull(run.get("schemaBookmark")));
        } else if (!ALL.equals(bookmarkId)) {
            predicates.add(builder.equal(run.get("schemaBookmark").get("id"), id(bookmarkId)));
        }
        if (!ALL.equals(status)) {
            predicates.add(builder.equal(run.get("status").as(String.class), status));
        }
        if (!ALL.equals(origin)) {
            predicates.add(builder.equal(run.get("origin").as(String.class), origin));
        }
        return builder.and(predicates.toArray(Predicate[]::new));
    }

    /** An id no row has stands in for one that is not a number, so the filter matches nothing. */
    private static Long id(String value) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException notAnId) {
            return -1L;
        }
    }
}
