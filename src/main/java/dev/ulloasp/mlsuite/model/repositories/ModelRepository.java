package dev.ulloasp.mlsuite.model.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.model.entities.Model;

@Repository
public interface ModelRepository extends JpaRepository<Model, Long> {

    List<Model> findByUserId(Long userId);

    boolean existsByNameAndUserId(String name, Long userId);

    Optional<Model> findByIdAndUserId(Long modelId, Long userId);

}
