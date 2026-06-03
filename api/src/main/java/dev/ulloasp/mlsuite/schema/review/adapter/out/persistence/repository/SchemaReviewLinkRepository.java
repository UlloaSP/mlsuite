package dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewLink;

public interface SchemaReviewLinkRepository extends JpaRepository<SchemaReviewLink, Long> {
    Optional<SchemaReviewLink> findByTokenHash(String tokenHash);

    Optional<SchemaReviewLink> findByIdAndOrganizationId(Long id, Long organizationId);

    List<SchemaReviewLink> findBySchemaIdAndSchemaVersionIdAndOrganizationIdOrderByCreatedAtDesc(
            Long schemaId, Long schemaVersionId, Long organizationId);
}
