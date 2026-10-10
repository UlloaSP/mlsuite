package dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewAssignmentStatusDto;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
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
                WHERE f.result.run = rr.run AND f.user = reviewer)
                THEN dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewState.IN_PROGRESS
            ELSE dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewState.PENDING END
            """;
    private static final String SOURCE = """
            FROM SchemaReviewRun rr JOIN rr.review review
            JOIN SchemaReviewAssignee assignee ON assignee.review = review
            JOIN assignee.user reviewer JOIN review.createdBy creator
            LEFT JOIN SchemaReviewRunSubmission submission
                ON submission.reviewRun = rr AND submission.user = reviewer
            WHERE rr.run.id = :runId
            AND (:filter = 'all'
                OR (:filter = 'COMPLETED' AND submission.id IS NOT NULL)
                OR (:filter = 'IN_PROGRESS' AND submission.id IS NULL AND EXISTS (
                    SELECT 1 FROM PredictionResultFeedback f WHERE f.result.run = rr.run AND f.user = reviewer))
                OR (:filter = 'PENDING' AND submission.id IS NULL AND NOT EXISTS (
                    SELECT 1 FROM PredictionResultFeedback f WHERE f.result.run = rr.run AND f.user = reviewer)))
            AND (lower(reviewer.fullName) LIKE :search ESCAPE '!'
                OR lower(reviewer.email) LIKE :search ESCAPE '!'
                OR lower(creator.fullName) LIKE :search ESCAPE '!'
                OR lower(creator.email) LIKE :search ESCAPE '!')
            """;

    private final EntityManager entities;

    public PageDto<SchemaReviewAssignmentStatusDto> page(Long runId, OffsetDateTime now, CatalogRequest request) {
        long total = (Long) bind(entities.createQuery("SELECT COUNT(assignee) " + SOURCE), runId, request)
                .getSingleResult();
        long offset = (long) request.page() * request.size();
        if (offset >= total || offset > Integer.MAX_VALUE) {
            return new PageDto<>(List.of(), request.page(), request.size(), total, false);
        }
        String order = switch (request.sort()) {
            case "reviewer" -> "lower(reviewer.fullName) ASC";
            case "submitted" -> "submission.submittedAt DESC NULLS LAST";
            default -> "review.createdAt DESC";
        };
        String select = "SELECT new " + DTO + "SchemaReviewAssignmentStatusDto("
                + "review.publicId, rr.publicId, new " + DTO
                + "SchemaReviewReviewerDto(reviewer.id, reviewer.fullName, reviewer.email), new " + DTO
                + "SchemaReviewReviewerDto(creator.id, creator.fullName, creator.email), " + STATE
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
