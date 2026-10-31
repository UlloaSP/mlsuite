package dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    boolean existsBySlug(String slug);

    Optional<Organization> findBySlug(String slug);

    /** The personal account of a user, the only kind of organization that names an owner here. */
    Optional<Organization> findByOwnerUserId(Long userId);

    /** What a superadmin works across: every team and their own personal account, that first. */
    @Query("""
            SELECT o FROM Organization o
            WHERE o.kind = dev.ulloasp.mlsuite.organization.domain.model.OrganizationKind.TEAM
            OR o.ownerUser.id = :userId
            ORDER BY o.kind, o.name
            """)
    List<Organization> findAdministeredBy(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Organization o WHERE o.id = :id")
    Optional<Organization> lockById(Long id);

    @Query("""
            SELECT o FROM Organization o
            WHERE o.kind = dev.ulloasp.mlsuite.organization.domain.model.OrganizationKind.TEAM
            AND (
                :search = ''
                OR lower(o.name) LIKE lower(concat('%', :search, '%'))
                OR lower(o.slug) LIKE lower(concat('%', :search, '%'))
                OR lower(coalesce(o.description, '')) LIKE lower(concat('%', :search, '%'))
            )
            """)
    Page<Organization> findCatalogPage(String search, Pageable pageable);

    /**
     * The accounts a user may switch to: their active memberships, personal account included, and
     * every team for a superadmin. {@code teamOnly} leaves the teams, for a list of organizations.
     */
    @Query("""
            SELECT o FROM Organization o
            WHERE (
                (:superadmin = true AND o.kind = dev.ulloasp.mlsuite.organization.domain.model.OrganizationKind.TEAM)
                OR o.ownerUser.id = :userId
                OR EXISTS (
                    SELECT m.id FROM OrganizationMembership m
                    WHERE m.organization = o
                    AND m.user.id = :userId
                    AND m.status = dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus.ACTIVE
                )
            )
            AND (:teamOnly = false OR o.kind = dev.ulloasp.mlsuite.organization.domain.model.OrganizationKind.TEAM)
            AND (
                lower(o.name) LIKE :search ESCAPE '!'
                OR lower(o.slug) LIKE :search ESCAPE '!'
            )
            """)
    Page<Organization> findAccessiblePage(Long userId, boolean superadmin, boolean teamOnly, String search,
            Pageable pageable);
}
