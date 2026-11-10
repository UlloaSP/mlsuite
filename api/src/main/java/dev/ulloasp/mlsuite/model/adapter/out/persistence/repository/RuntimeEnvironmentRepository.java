package dev.ulloasp.mlsuite.model.adapter.out.persistence.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.model.domain.model.RuntimeEnvironment;

public interface RuntimeEnvironmentRepository extends JpaRepository<RuntimeEnvironment, Long> {

    Optional<RuntimeEnvironment> findByKey(String key);
}
