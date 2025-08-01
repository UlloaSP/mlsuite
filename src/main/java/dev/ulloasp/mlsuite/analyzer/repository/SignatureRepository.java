package dev.ulloasp.mlsuite.analyzer.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.analyzer.entities.Signature;

@Repository
public interface SignatureRepository extends JpaRepository<Signature, Long> {

    List<Signature> findByModelId(Long modelId);

    Signature findByModelIdAndVersion(Long modelId, Long version);

    Long findTopByModelIdOrderByVersionDesc(Long modelId);

    boolean existsByModelIdAndInputSignature(Long modelId, String inputSignature);

    @Query("SELECT s FROM Signature s WHERE s.id = :signatureId AND s.model.user.id = :userId")
    Optional<Signature> findByIdAndUserId(Long signatureId, Long userId);

}
