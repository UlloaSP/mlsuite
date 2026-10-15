package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.domain.model.BookmarkApiKey;

public interface BookmarkApiKeyRepository extends JpaRepository<BookmarkApiKey, Long> {

    List<BookmarkApiKey> findByBookmarkIdOrderByCreatedAtAscIdAsc(Long bookmarkId);

    Optional<BookmarkApiKey> findByIdAndBookmarkId(Long id, Long bookmarkId);

    Optional<BookmarkApiKey> findByKeyHash(String keyHash);

    boolean existsByBookmarkIdAndNameIgnoreCase(Long bookmarkId, String name);

    /**
     * Moves the key's last use forward, never back, in one statement: a key revoked meanwhile
     * matches no row, and calls finishing out of order cannot rewind it.
     */
    @Modifying
    @Query("""
            UPDATE BookmarkApiKey k SET k.lastUsedAt = :now
            WHERE k.id = :id AND (k.lastUsedAt IS NULL OR k.lastUsedAt < :now)
            """)
    int markUsed(Long id, OffsetDateTime now);
}
