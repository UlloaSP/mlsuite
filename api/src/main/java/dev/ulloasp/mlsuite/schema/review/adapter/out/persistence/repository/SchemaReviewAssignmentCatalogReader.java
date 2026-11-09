package dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewAssignmentStatusDto;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.CatalogValues;
import dev.ulloasp.mlsuite.util.PageDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;

/** Selects reviewers and their progress in the database, without loading every assignment's payloads. */
@Repository
@RequiredArgsConstructor
public class SchemaReviewAssignmentCatalogReader {
    private static final String DTO = "dev.ulloasp.mlsuite.schema.review.application.dto.";
    private static final String STATE = """
            CASE WHEN submission.id IS NOT NULL
                THEN dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewState.COMPLETED
            WHEN EXISTS (SELECT 1 FROM PredictionResultFeedback f
                WHERE f.result.run = rr.run AND f.createdBy.userId = reviewer.id AND f.review = review)
                THEN dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewState.IN_PROGRESS
            ELSE dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewState.PENDING END
            """;
    private static final String SOURCE = """
            FROM SchemaReviewRun rr JOIN rr.review review
            JOIN SchemaReviewAssignee assignee ON assignee.review = review
            JOIN assignee.user reviewer JOIN review.createdBy creatorPrincipal LEFT JOIN User creator ON creator.id = creatorPrincipal.userId
            LEFT JOIN SchemaReviewRunSubmission submission
                ON submission.reviewRun = rr AND submission.user = reviewer
            WHERE rr.run.id = :runId
            AND (:filter = 'all'
                OR (:filter = 'COMPLETED' AND submission.id IS NOT NULL)
                OR (:filter = 'IN_PROGRESS' AND submission.id IS NULL AND EXISTS (
                    SELECT 1 FROM PredictionResultFeedback f
                    WHERE f.result.run = rr.run AND f.createdBy.userId = reviewer.id AND f.review = review))
                OR (:filter = 'PENDING' AND submission.id IS NULL AND NOT EXISTS (
                    SELECT 1 FROM PredictionResultFeedback f
                    WHERE f.result.run = rr.run AND f.createdBy.userId = reviewer.id AND f.review = review)))
            AND (lower(reviewer.fullName) LIKE :search ESCAPE '!'
                OR lower(reviewer.email) LIKE :search ESCAPE '!'
                OR lower(creator.fullName) LIKE :search ESCAPE '!'
                OR lower(creator.email) LIKE :search ESCAPE '!')
            """;

    private final EntityManager entities;

    /** "updated", what a request without a sort holds, keeps the default order: latest requested first. */
    public PageDto<SchemaReviewAssignmentStatusDto> page(Long runId, OffsetDateTime now, CatalogRequest request) {
        CatalogValues.require("filter", request.filter(), List.of("all", "COMPLETED", "IN_PROGRESS", "PENDING"));
        String order = switch (request.sort()) {
            case "requested", "updated" -> "review.createdAt DESC";
            case "submitted" -> "submission.submittedAt DESC NULLS LAST";
            case "reviewer" -> "lower(reviewer.fullName) ASC";
            default -> throw CatalogValues.unknown("sort", request.sort(),
                    List.of("requested", "submitted", "reviewer", "updated"));
        };
        long total = (Long) bind(entities.createQuery("SELECT COUNT(assignee) " + SOURCE), runId, request)
                .getSingleResult();
        long offset = (long) request.page() * request.size();
        if (offset >= total || offset > Integer.MAX_VALUE) {
            return new PageDto<>(List.of(), request.page(), request.size(), total, false);
        }
        String select = "SELECT new " + DTO + "SchemaReviewAssignmentStatusDto("
                + "review.publicId, rr.publicId, new " + DTO
                + "SchemaReviewReviewerDto(reviewer.id, reviewer.fullName, reviewer.email, reviewer.avatarUpdatedAt), new " + DTO
                + "SchemaReviewCreatorDto(coalesce(creator.fullName, creatorPrincipal.formerLabel), creator.email), " + STATE
                + ", submission.submittedAt, review.createdAt, review.updatedAt, review.expiresAt, "
                + "review.expiresAt <= :now) ";
        var query = entities.createQuery(select + SOURCE + " ORDER BY " + order
                + ", review.publicId ASC, rr.publicId ASC, reviewer.id ASC", SchemaReviewAssignmentStatusDto.class);
        bind(query, runId, request).setParameter("now", now);
        return new PageDto<>(query.setFirstResult((int) offset).setMaxResults(request.size()).getResultList(),
                request.page(), request.size(), total, offset + request.size() < total);
    }

    private Query bind(Query query, Long runId, CatalogRequest request) {
        return query.setParameter("runId", runId).setParameter("filter", request.filter())
                .setParameter("search", CatalogPages.likeLiteral(request.search()));
    }
}
