package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmarkExample;

public interface SchemaBookmarkExampleRepository extends JpaRepository<SchemaBookmarkExample, Long> {

    /** In the order they were marked, which is the order visitors are offered them. */
    List<SchemaBookmarkExample> findByBookmarkIdOrderByCreatedAtAscIdAsc(Long bookmarkId);

    List<SchemaBookmarkExample> findByBookmarkIdIn(Collection<Long> bookmarkIds);

    Optional<SchemaBookmarkExample> findByBookmarkIdAndRunId(Long bookmarkId, Long runId);

    void deleteByBookmarkIdAndRunId(Long bookmarkId, Long runId);
}
