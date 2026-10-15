package dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClientKey;

public interface ApiClientKeyRepository extends JpaRepository<ApiClientKey, Long> {

    List<ApiClientKey> findByClientIdOrderByCreatedAtAscIdAsc(Long clientId);

    Optional<ApiClientKey> findByIdAndClientId(Long id, Long clientId);

    @Query("SELECT k FROM ApiClientKey k JOIN FETCH k.client c JOIN FETCH c.organization WHERE k.keyHash = :keyHash")
    Optional<ApiClientKey> findByKeyHash(String keyHash);

    @Query("""
            SELECT new dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiKeyUsage(
                k.client.id, COUNT(k), MAX(k.lastUsedAt))
            FROM ApiClientKey k WHERE k.client.id IN :clientIds GROUP BY k.client.id
            """)
    List<ApiKeyUsage> usageOf(Collection<Long> clientIds);

    /**
     * Moves the key's last use forward, never back, in one statement: a key revoked meanwhile
     * matches no row, and calls finishing out of order cannot rewind it.
     */
    @Modifying
    @Query("""
            UPDATE ApiClientKey k SET k.lastUsedAt = :now
            WHERE k.id = :id AND (k.lastUsedAt IS NULL OR k.lastUsedAt < :now)
            """)
    int markUsed(Long id, OffsetDateTime now);
}
