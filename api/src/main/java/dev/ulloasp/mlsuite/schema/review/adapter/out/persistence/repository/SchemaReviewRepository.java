package dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;

public interface SchemaReviewRepository extends JpaRepository<SchemaReview, Long> {
    Optional<SchemaReview> findByPublicIdAndOrganizationId(String publicId, Long organizationId);

    List<SchemaReview> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);

    boolean existsBySchemaId(Long schemaId);

    long countByOrganizationId(Long organizationId);
}
