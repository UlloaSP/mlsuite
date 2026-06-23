package dev.ulloasp.mlsuite.team.adapter.out.persistence.repository;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.team.domain.model.Team;
import dev.ulloasp.mlsuite.team.domain.model.TeamStatus;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {

    List<Team> findByOrganizationIdOrderByNameAsc(Long organizationId);

    @Query("""
            SELECT t FROM Team t
            WHERE t.organization.id = :organizationId
            AND (
                lower(t.name) LIKE lower(concat('%', :search, '%'))
                OR lower(t.slug) LIKE lower(concat('%', :search, '%'))
                OR lower(coalesce(t.description, '')) LIKE lower(concat('%', :search, '%'))
            )
            """)
    List<Team> searchByOrganizationId(Long organizationId, String search, Pageable pageable);

    boolean existsByOrganizationIdAndSlug(Long organizationId, String slug);

    long countByOrganizationId(Long organizationId);

    long countByOrganizationIdAndStatus(Long organizationId, TeamStatus status);
}
