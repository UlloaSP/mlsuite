package dev.ulloasp.mlsuite.team.adapter.out.persistence.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.team.domain.model.Team;
import dev.ulloasp.mlsuite.team.domain.model.TeamStatus;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {

    List<Team> findByOrganizationIdOrderByNameAsc(Long organizationId);

    boolean existsByOrganizationIdAndSlug(Long organizationId, String slug);

    long countByOrganizationId(Long organizationId);

    long countByOrganizationIdAndStatus(Long organizationId, TeamStatus status);
}
