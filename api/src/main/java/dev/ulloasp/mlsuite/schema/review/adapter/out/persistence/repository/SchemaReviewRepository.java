package dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;

public interface SchemaReviewRepository extends JpaRepository<SchemaReview, Long> {

    /** A review as those who manage them see it, with how many runs and reviewers it has left. */
    interface ManagedReview {
        SchemaReview getReview();

        long getRuns();

        long getReviewers();
    }

    String MANAGED = """
            FROM SchemaReview review
            WHERE review.organization.id = :organizationId
            AND lower(review.schema.name) LIKE :search ESCAPE '!'
            AND (:filter = 'all'
                OR (:filter = 'open' AND review.expiresAt > :now)
                OR (:filter = 'expired' AND review.expiresAt <= :now)
                OR (:filter = 'empty' AND NOT EXISTS (SELECT 1 FROM SchemaReviewRun rr WHERE rr.review = review)))
            """;

    /** {@code filter} is "open", "expired", "empty" (no runs left) or "all"; any other matches nothing. */
    @Query(value = """
            SELECT review AS review,
                (SELECT COUNT(rr) FROM SchemaReviewRun rr WHERE rr.review = review) AS runs,
                (SELECT COUNT(a) FROM SchemaReviewAssignee a WHERE a.review = review) AS reviewers
            """ + MANAGED + "ORDER BY review.createdAt DESC, review.id ASC",
            countQuery = "SELECT COUNT(review) " + MANAGED)
    Page<ManagedReview> findManagedPage(Long organizationId, String search, String filter, OffsetDateTime now,
            Pageable pageable);

    Optional<SchemaReview> findByPublicIdAndOrganizationId(String publicId, Long organizationId);

    List<SchemaReview> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);

    boolean existsBySchemaId(Long schemaId);

    boolean existsBySchemaVersionId(Long schemaVersionId);

    long countByOrganizationId(Long organizationId);
}
