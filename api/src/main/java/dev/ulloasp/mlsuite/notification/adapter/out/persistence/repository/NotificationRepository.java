package dev.ulloasp.mlsuite.notification.adapter.out.persistence.repository;

import java.time.OffsetDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.notification.domain.model.Notification;
import dev.ulloasp.mlsuite.notification.domain.model.NotificationTargetType;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("""
            SELECT n FROM Notification n
            WHERE n.recipientUserId = :recipient AND (:unreadOnly = FALSE OR n.readAt IS NULL)""")
    Page<Notification> findCatalog(@Param("recipient") Long recipient, @Param("unreadOnly") boolean unreadOnly,
            Pageable pageable);

    long countByRecipientUserIdAndReadAtIsNull(Long recipientUserId);

    @Modifying
    @Query("""
            UPDATE Notification n SET n.readAt = COALESCE(n.readAt, :now)
            WHERE n.id = :id AND n.recipientUserId = :recipient""")
    int markRead(@Param("id") Long id, @Param("recipient") Long recipient, @Param("now") OffsetDateTime now);

    @Modifying
    @Query("UPDATE Notification n SET n.readAt = :now WHERE n.recipientUserId = :recipient AND n.readAt IS NULL")
    int markAllRead(@Param("recipient") Long recipient, @Param("now") OffsetDateTime now);

    @Modifying
    @Query("""
            UPDATE Notification n SET n.readAt = :now
            WHERE n.recipientUserId = :recipient AND n.targetType = :targetType AND n.targetId = :targetId
            AND n.readAt IS NULL""")
    int markTargetRead(@Param("recipient") Long recipient, @Param("targetType") NotificationTargetType targetType,
            @Param("targetId") String targetId, @Param("now") OffsetDateTime now);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.id = :id AND n.recipientUserId = :recipient")
    int deleteOwn(@Param("id") Long id, @Param("recipient") Long recipient);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.recipientUserId = :recipient AND n.readAt IS NOT NULL")
    int deleteRead(@Param("recipient") Long recipient);

    /** One batch, in its own transaction; instances pruning at once skip each other's rows. */
    @Transactional
    @Modifying
    @Query(value = """
            DELETE FROM notification WHERE id IN (
                SELECT id FROM notification WHERE read_at < :cutoff LIMIT :batchSize FOR UPDATE SKIP LOCKED)""",
            nativeQuery = true)
    int deleteReadBefore(@Param("cutoff") OffsetDateTime cutoff, @Param("batchSize") int batchSize);
}
