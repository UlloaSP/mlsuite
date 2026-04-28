package dev.ulloasp.mlsuite.team.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.team.domain.model.TeamMembership;

@Repository
public interface TeamMembershipRepository extends JpaRepository<TeamMembership, Long> {

    List<TeamMembership> findByTeamIdAndStatusOrderByCreatedAtAsc(Long teamId, MembershipStatus status);

    Optional<TeamMembership> findByTeamIdAndUserId(Long teamId, Long userId);
}
