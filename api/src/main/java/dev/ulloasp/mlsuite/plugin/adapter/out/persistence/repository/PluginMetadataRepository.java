package dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;

public interface PluginMetadataRepository extends JpaRepository<PluginMetadata, String> {

    @Query("""
            SELECT p FROM PluginMetadata p
            WHERE p.organization.id = :organizationId
            AND (
                lower(p.fileName) LIKE lower(concat('%', :search, '%'))
                OR lower(p.pluginType) LIKE lower(concat('%', :search, '%'))
                OR lower(coalesce(p.kind, '')) LIKE lower(concat('%', :search, '%'))
            )
            """)
    List<PluginMetadata> searchByOrganizationId(Long organizationId, String search, Pageable pageable);

    Optional<PluginMetadata> findByIdAndOrganizationId(String id, Long organizationId);

    long countByOrganizationId(Long organizationId);
}
