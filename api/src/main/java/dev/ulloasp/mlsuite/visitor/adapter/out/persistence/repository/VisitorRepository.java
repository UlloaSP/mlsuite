package dev.ulloasp.mlsuite.visitor.adapter.out.persistence.repository;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.visitor.domain.model.Visitor;

public interface VisitorRepository extends JpaRepository<Visitor, UUID> {

    /** Marks the visitor seen at {@code now} unless it was seen after {@code since}, in its own transaction. */
    @Modifying
    @Transactional
    @Query("update Visitor v set v.lastSeenAt = :now where v.id = :id and v.lastSeenAt < :since")
    int markSeen(UUID id, OffsetDateTime now, OffsetDateTime since);
}
