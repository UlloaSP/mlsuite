package dev.ulloasp.mlsuite.audit.adapter.out.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.audit.domain.model.AuditEvent;

/** Reads the log. Entries are written by AuditLogService and removed by AuditRetention alone. */
@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, Long>, JpaSpecificationExecutor<AuditEvent> {
}
