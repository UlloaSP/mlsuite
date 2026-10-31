package dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClient;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;

public interface ApiClientRepository extends JpaRepository<ApiClient, Long> {

    /** A filter keeps every client ({@code all}), the active ones or the suspended ones. */
    String STATUS_FILTER = """
            (:filter = 'all'
                OR (:filter = 'active' AND c.status = dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClientStatus.ACTIVE)
                OR (:filter = 'suspended' AND c.status = dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClientStatus.SUSPENDED))
            """;

    Optional<ApiClient> findByIdAndOrganizationId(Long id, Long organizationId);

    /** A bookmark the client was given, by the id clients call it by, while its schema is not archived. */
    @Query("""
            SELECT b FROM ApiClient c JOIN c.bookmarks b
            WHERE c.id = :clientId AND b.publicId = :apiId AND b.schema.archivedAt IS NULL
            AND b.schema.purgingAt IS NULL AND b.schema.organization.purgingAt IS NULL
            """)
    Optional<SchemaBookmark> findGrantedBookmark(Long clientId, String apiId);

    boolean existsByOrganizationIdAndNameIgnoreCase(Long organizationId, String name);

    boolean existsByOrganizationIdAndNameIgnoreCaseAndIdNot(Long organizationId, String name, Long id);

    @Query(value = """
            SELECT c FROM ApiClient c
            WHERE c.organization.id = :organizationId
              AND (:search = '' OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(c.description, '')) LIKE LOWER(CONCAT('%', :search, '%')))
              AND """ + STATUS_FILTER, countQuery = """
            SELECT COUNT(c) FROM ApiClient c
            WHERE c.organization.id = :organizationId
              AND (:search = '' OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(c.description, '')) LIKE LOWER(CONCAT('%', :search, '%')))
              AND """ + STATUS_FILTER)
    Page<ApiClient> findCatalog(Long organizationId, String search, String filter, Pageable pageable);

    /** Every organization's clients, for the platform. */
    @Query(value = """
            SELECT c FROM ApiClient c JOIN c.organization o
            WHERE (:search = '' OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(o.name) LIKE LOWER(CONCAT('%', :search, '%')))
              AND """ + STATUS_FILTER, countQuery = """
            SELECT COUNT(c) FROM ApiClient c JOIN c.organization o
            WHERE (:search = '' OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(o.name) LIKE LOWER(CONCAT('%', :search, '%')))
              AND """ + STATUS_FILTER)
    Page<ApiClient> findPlatformCatalog(String search, String filter, Pageable pageable);

    /** The organizations that have at least one client, for the platform's limits. */
    @Query(value = """
            SELECT o FROM Organization o
            WHERE EXISTS (SELECT 1 FROM ApiClient c WHERE c.organization = o)
              AND (:search = '' OR LOWER(o.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """, countQuery = """
            SELECT COUNT(o) FROM Organization o
            WHERE EXISTS (SELECT 1 FROM ApiClient c WHERE c.organization = o)
              AND (:search = '' OR LOWER(o.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<Organization> findOrganizationsWithClients(String search, Pageable pageable);

    @Query("""
            SELECT new dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiClientCount(
                c.id, COUNT(b))
            FROM ApiClient c LEFT JOIN c.bookmarks b
            WHERE c.id IN :ids GROUP BY c.id
            """)
    List<ApiClientCount> countBookmarks(Collection<Long> ids);

    @Query("""
            SELECT new dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiClientCount(
                c.organization.id, COUNT(c))
            FROM ApiClient c WHERE c.organization.id IN :organizationIds GROUP BY c.organization.id
            """)
    List<ApiClientCount> countByOrganization(Collection<Long> organizationIds);

    /** The names of the clients that may run each bookmark, by bookmark id. */
    @Query("""
            SELECT b.id, c.name FROM ApiClient c JOIN c.bookmarks b
            WHERE c.organization.id = :organizationId ORDER BY LOWER(c.name)
            """)
    List<Object[]> findClientNamesByBookmark(Long organizationId);
}
