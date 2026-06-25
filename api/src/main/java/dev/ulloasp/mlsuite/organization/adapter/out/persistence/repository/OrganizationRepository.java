package dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    boolean existsBySlug(String slug);

    Optional<Organization> findBySlug(String slug);

    @Query("""
            SELECT o FROM Organization o
            WHERE (
                :search = ''
                OR lower(o.name) LIKE lower(concat('%', :search, '%'))
                OR lower(o.slug) LIKE lower(concat('%', :search, '%'))
                OR lower(coalesce(o.description, '')) LIKE lower(concat('%', :search, '%'))
            )
            AND (
                :filter = 'all'
                OR (:filter = 'with-assets' AND (
                    EXISTS (SELECT 1 FROM Model m WHERE m.organization.id = o.id)
                    OR EXISTS (SELECT 1 FROM Schema s WHERE s.organization.id = o.id)
                    OR EXISTS (SELECT 1 FROM PluginMetadata p WHERE p.organization.id = o.id)
                ))
                OR (:filter = 'empty' AND NOT (
                    EXISTS (SELECT 1 FROM Model m WHERE m.organization.id = o.id)
                    OR EXISTS (SELECT 1 FROM Schema s WHERE s.organization.id = o.id)
                    OR EXISTS (SELECT 1 FROM PluginMetadata p WHERE p.organization.id = o.id)
                ))
            )
            """)
    Page<Organization> findCatalogPage(String search, String filter, Pageable pageable);
}
