package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.schema.domain.model.ProfilePin;

public interface ProfilePinRepository extends JpaRepository<ProfilePin, Long> {

    List<ProfilePin> findByUserIdOrderBySlotAsc(Long userId);
}
