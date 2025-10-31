package dev.ulloasp.mlsuite.prediction.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.prediction.entities.Target;

@Repository
public interface TargetRepository extends JpaRepository<Target, Long> {
    List<Target> findByPredictionId(Long predictionId);

    @Query("SELECT t FROM Target t WHERE t.id = :targetId AND t.prediction.signature.model.user.id = :userId")
    Optional<Target> findByIdAndUserId(Long targetId, Long userId);
}
