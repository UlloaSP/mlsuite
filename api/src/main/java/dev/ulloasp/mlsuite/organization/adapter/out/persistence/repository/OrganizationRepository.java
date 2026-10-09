package dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository;

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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Organization o WHERE o.id = :id")
    Optional<Organization> lockById(Long id);

    @Query("""
            SELECT o FROM Organization o
            WHERE (
                :search = ''
                OR lower(o.name) LIKE lower(concat('%', :search, '%'))
                OR lower(o.slug) LIKE lower(concat('%', :search, '%'))
                OR lower(coalesce(o.description, '')) LIKE lower(concat('%', :search, '%'))
            )
            """)
    Page<Organization> findCatalogPage(String search, Pageable pageable);

    /** The organizations a user may switch to: every one for a superadmin, else their active memberships. */
    @Query("""
            SELECT o FROM Organization o
            WHERE (
                :superadmin = true
                OR EXISTS (
                    SELECT m.id FROM OrganizationMembership m
                    WHERE m.organization = o
                    AND m.user.id = :userId
                    AND m.status = dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus.ACTIVE
                )
            )
            AND (
                lower(o.name) LIKE :search ESCAPE '!'
                OR lower(o.slug) LIKE :search ESCAPE '!'
            )
            """)
    Page<Organization> findAccessiblePage(Long userId, boolean superadmin, String search, Pageable pageable);
}
