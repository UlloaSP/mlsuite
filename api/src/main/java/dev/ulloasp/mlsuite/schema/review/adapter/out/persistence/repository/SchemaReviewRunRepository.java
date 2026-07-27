package dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRun;

public interface SchemaReviewRunRepository extends JpaRepository<SchemaReviewRun, Long> {
    List<SchemaReviewRun> findByReviewIdOrderByIdAsc(Long reviewId);

    List<SchemaReviewRun> findByRunIdOrderByIdAsc(Long runId);

    Optional<SchemaReviewRun> findByReviewIdAndPublicId(Long reviewId, String publicId);

}
