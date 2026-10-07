package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;

public interface SchemaBookmarkRepository extends JpaRepository<SchemaBookmark, Long> {
    /** The one rule for what anyone may read: a published bookmark whose schema is not archived. */
    String PUBLISHED = """
            b.visibility = dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility.PUBLIC
            AND b.schema.archivedAt IS NULL
            """;

    void deleteBySchemaId(Long schemaId);
    List<SchemaBookmark> findBySchemaIdOrderByNameAsc(Long schemaId);

    @Query("""
            SELECT b FROM SchemaBookmark b
            WHERE b.schema.organization.id = :organizationId AND b.schema.archivedAt IS NULL
            ORDER BY b.schema.name ASC, b.name ASC
            """)
    List<SchemaBookmark> findActiveByOrganizationId(Long organizationId);

    Optional<SchemaBookmark> findBySchemaIdAndName(Long schemaId, String name);

    @Query("SELECT b FROM SchemaBookmark b WHERE b.id = :id AND b.schema.organization.id = :organizationId")
    Optional<SchemaBookmark> findByIdAndOrganizationId(Long id, Long organizationId);

    @Query("SELECT b FROM SchemaBookmark b WHERE b.publicId = :publicId AND b.schema.organization.id = :organizationId")
    Optional<SchemaBookmark> findByPublicIdAndOrganizationId(String publicId, Long organizationId);

    @Query("SELECT b FROM SchemaBookmark b WHERE b.publicId = :publicId AND " + PUBLISHED)
    Optional<SchemaBookmark> findPublishedByPublicId(String publicId);

    /** One page of what anyone may read, for the public feed, searched by what a card shows. */
    @Query("SELECT b FROM SchemaBookmark b WHERE " + PUBLISHED + """
            AND (
                :search = ''
                OR lower(b.name) LIKE lower(concat('%', :search, '%'))
                OR lower(b.schema.description) LIKE lower(concat('%', :search, '%'))
                OR lower(b.schema.organization.name) LIKE lower(concat('%', :search, '%'))
            )
            """)
    Page<SchemaBookmark> findPublishedPage(String search, Pageable pageable);

    /** Every bookmark flagged public on the instance, whether or not its schema is archived. */
    @Query("""
            SELECT b FROM SchemaBookmark b
            WHERE b.visibility = dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility.PUBLIC
            AND (
                :search = ''
                OR lower(b.name) LIKE lower(concat('%', :search, '%'))
                OR lower(b.schema.name) LIKE lower(concat('%', :search, '%'))
                OR lower(b.schema.organization.name) LIKE lower(concat('%', :search, '%'))
            )
            """)
    Page<SchemaBookmark> findPublicPage(String search, Pageable pageable);

    @Query("""
            SELECT b FROM SchemaBookmark b
            WHERE b.schema.organization.id = :organizationId
            AND b.schema.archivedAt IS NULL
            AND (
                lower(b.name) LIKE lower(concat('%', :search, '%'))
                OR lower(b.schema.name) LIKE lower(concat('%', :search, '%'))
                OR lower(coalesce(b.version.name, '')) LIKE lower(concat('%', :search, '%'))
            )
            """)
    List<SchemaBookmark> searchByOrganizationId(Long organizationId, String search, Pageable pageable);
}
