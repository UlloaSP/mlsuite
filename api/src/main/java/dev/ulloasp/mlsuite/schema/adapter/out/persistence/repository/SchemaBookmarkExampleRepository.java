package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.application.dto.BookmarkExampleStats;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmarkExample;

public interface SchemaBookmarkExampleRepository
        extends JpaRepository<SchemaBookmarkExample, Long>, JpaSpecificationExecutor<SchemaBookmarkExample> {

    /** In the order they were marked, which is the order visitors are offered them. */
    List<SchemaBookmarkExample> findByBookmarkIdOrderByCreatedAtAscIdAsc(Long bookmarkId);

    @Query("""
            SELECT new dev.ulloasp.mlsuite.schema.application.dto.BookmarkExampleStats(
                e.bookmark.id,
                SUM(CASE WHEN e.run.schemaVersion.id = e.bookmark.version.id THEN 1L ELSE 0L END),
                SUM(CASE WHEN e.run.schemaVersion.id <> e.bookmark.version.id THEN 1L ELSE 0L END))
            FROM SchemaBookmarkExample e WHERE e.bookmark.id IN :bookmarkIds GROUP BY e.bookmark.id
            """)
    List<BookmarkExampleStats> countByBookmarkIds(Collection<Long> bookmarkIds);

    Optional<SchemaBookmarkExample> findByBookmarkIdAndRunId(Long bookmarkId, Long runId);

    void deleteByBookmarkIdAndRunId(Long bookmarkId, Long runId);
}
