package dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewAssignee;

public interface SchemaReviewAssigneeRepository extends JpaRepository<SchemaReviewAssignee, Long> {
    boolean existsByReviewIdAndUserId(Long reviewId, Long userId);

    List<SchemaReviewAssignee> findByReviewIdOrderByIdAsc(Long reviewId);
}
