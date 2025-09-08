package dev.ulloasp.mlsuite.analyzer.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.analyzer.entities.Prediction;

@Repository
public interface PredictionRepository extends JpaRepository<Prediction, Long> {

    List<Prediction> findBySignatureId(Long signatureId);

    @Query("SELECT p FROM Prediction p WHERE p.signature.id = :signatureId AND p.signature.model.user.id = :userId")
    Optional<Prediction> findByIdAndUserId(Long predictionId, Long userId);
}
