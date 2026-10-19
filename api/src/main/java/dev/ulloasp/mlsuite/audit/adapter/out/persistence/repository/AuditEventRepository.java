package dev.ulloasp.mlsuite.audit.adapter.out.persistence.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.audit.domain.model.AuditEvent;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {

    /**
     * {@code action} is an action code or {@code all}; {@code search} is a lower-case LIKE pattern,
     * escaped with {@code !}, matched against the actor's name, the target id and the metadata.
     */
    String CATALOG = """
            FROM AuditEvent e
            WHERE e.organization.id = :organizationId
              AND (:action = 'all' OR e.action = :action)
              AND (LOWER(e.actor.fullName) LIKE :search ESCAPE '!'
                   OR LOWER(COALESCE(e.targetId, '')) LIKE :search ESCAPE '!'
                   OR LOWER(COALESCE(e.metadata, '')) LIKE :search ESCAPE '!')
            """;

    /** Newest first. */
    @EntityGraph(attributePaths = "actor")
    @Query(value = "SELECT e " + CATALOG + " ORDER BY e.createdAt DESC, e.id DESC",
            countQuery = "SELECT COUNT(e) " + CATALOG)
    Page<AuditEvent> findCatalog(Long organizationId, String action, String search, Pageable pageable);

    long countByOrganizationId(Long organizationId);
}
