package dev.ulloasp.mlsuite.review.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.review.domain.model.ReviewLink;

public interface ReviewLinkRepository extends JpaRepository<ReviewLink, Long> {
    Optional<ReviewLink> findByTokenHash(String tokenHash);

    Optional<ReviewLink> findByIdAndOrganizationId(Long id, Long organizationId);

    List<ReviewLink> findByModelIdAndSignatureIdAndOrganizationIdOrderByCreatedAtDesc(Long modelId, Long signatureId, Long organizationId);
}
