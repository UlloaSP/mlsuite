package dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewLinkRun;

public interface SchemaReviewLinkRunRepository extends JpaRepository<SchemaReviewLinkRun, Long> {
    List<SchemaReviewLinkRun> findByReviewLinkIdOrderByIdAsc(Long reviewLinkId);

    Optional<SchemaReviewLinkRun> findByReviewLinkIdAndRunId(Long reviewLinkId, Long runId);

    long countByReviewLinkId(Long reviewLinkId);
}
