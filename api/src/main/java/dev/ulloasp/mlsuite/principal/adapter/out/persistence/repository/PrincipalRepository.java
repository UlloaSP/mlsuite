package dev.ulloasp.mlsuite.principal.adapter.out.persistence.repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import dev.ulloasp.mlsuite.principal.domain.model.PrincipalKind;

@Repository
public interface PrincipalRepository extends JpaRepository<Principal, Long> {

    Optional<Principal> findByUserId(Long userId);

    Optional<Principal> findByApiClientId(Long apiClientId);

    Optional<Principal> findByVisitorTokenSha256(String visitorTokenSha256);

    /** The visitor whose cookie carries {@code token}. */
    default Optional<Principal> findByVisitorToken(UUID token) {
        return findByVisitorTokenSha256(Principal.digest(token));
    }

    Optional<Principal> findByKind(PrincipalKind kind);

    /** Marks a visitor seen unless it was seen after {@code since}, in its own transaction. */
    @Modifying
    @Transactional
    @Query("UPDATE Principal p SET p.lastSeenAt = :now WHERE p.visitorTokenSha256 = :digest AND p.lastSeenAt < :since")
    int markSeenByDigest(String digest, OffsetDateTime now, OffsetDateTime since);

    default int markSeen(UUID token, OffsetDateTime now, OffsetDateTime since) {
        return markSeenByDigest(Principal.digest(token), now, since);
    }
}
