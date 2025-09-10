package dev.ulloasp.mlsuite.signature.repositories;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.signature.entities.Signature;

@Repository
public interface SignatureRepository extends JpaRepository<Signature, Long> {

    List<Signature> findByModelId(Long modelId);

    Signature findByModelIdAndMajorAndMinorAndPatch(Long modelId, int major, int minor, int patch);

    boolean existsByModelIdAndMajorAndMinorAndPatch(Long modelId, int major, int minor, int patch);

    boolean existsByModelIdAndInputSignature(Long modelId, Map<String, Object> inputSignature);

    @Query("SELECT s FROM Signature s WHERE s.id = :signatureId AND s.model.user.id = :userId")
    Optional<Signature> findByIdAndUserId(Long signatureId, Long userId);

}
