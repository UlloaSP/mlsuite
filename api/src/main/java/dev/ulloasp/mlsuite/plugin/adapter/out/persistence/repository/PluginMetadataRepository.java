package dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
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

    /**
     * One page of an organization's plugins. {@code type} is "field", "report" or "all"; {@code sort}
     * "name" orders by display name, anything else by the newest update.
     */
    @Query("""
            SELECT p FROM PluginMetadata p
            WHERE p.organization.id = :organizationId
            AND (:type = 'all' OR p.pluginType = :type)
            AND (
                lower(p.fileName) LIKE :search ESCAPE '!'
                OR lower(coalesce(p.kind, '')) LIKE :search ESCAPE '!'
            )
            ORDER BY CASE WHEN :sort = 'name' THEN lower(coalesce(p.kind, p.fileName)) END ASC,
                p.updatedAt DESC, lower(p.fileName) ASC, p.id ASC
            """)
    Page<PluginMetadata> findCatalogPage(Long organizationId, String type, String search, String sort,
            Pageable pageable);

    long countByOrganizationIdAndPluginType(Long organizationId, String pluginType);

    Optional<PluginMetadata> findByIdAndOrganizationId(String id, Long organizationId);

    Optional<PluginMetadata> findByObjectKeyAndOrganizationId(String objectKey, Long organizationId);

    long countByOrganizationId(Long organizationId);

    List<PluginMetadata> findByOrganizationIdAndKindInOrderByIdAsc(Long organizationId, Collection<String> kinds);
}
