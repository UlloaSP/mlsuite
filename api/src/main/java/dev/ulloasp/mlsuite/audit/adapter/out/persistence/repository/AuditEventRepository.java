package dev.ulloasp.mlsuite.audit.adapter.out.persistence.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.audit.domain.model.AuditEvent;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {

    List<AuditEvent> findTop20ByOrganizationIdOrderByCreatedAtDesc(Long organizationId);

    long countByOrganizationId(Long organizationId);
}
