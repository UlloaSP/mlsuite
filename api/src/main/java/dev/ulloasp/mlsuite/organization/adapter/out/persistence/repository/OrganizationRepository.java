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
}
