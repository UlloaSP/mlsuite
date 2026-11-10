package dev.ulloasp.mlsuite.schema.application.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.util.CatalogPages;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

/** Searches only the public inputs a visitor may see, in bounded projections rather than managed run graphs. */
@Component
@RequiredArgsConstructor
class PublicRunCatalogSearch {
    private static final int BATCH_SIZE = 100;
    private final EntityManager entities;

    List<Long> matchingIds(Long authorId, Long bookmarkId, String search) {
        List<Long> ids = entities.createQuery("""
                SELECT r.id FROM PredictionRun r
                WHERE r.createdBy.id = :authorId AND r.schemaBookmark.id = :bookmarkId
                ORDER BY r.createdAt DESC, r.id ASC
                """, Long.class).setParameter("authorId", authorId).setParameter("bookmarkId", bookmarkId)
                .getResultList();
        List<Long> matching = new ArrayList<>();
        for (int offset = 0; offset < ids.size(); offset += BATCH_SIZE) {
            var batch = ids.subList(offset, Math.min(ids.size(), offset + BATCH_SIZE));
            var rows = entities.createQuery("""
                    SELECT r.id, r.createdAt, r.inputData, r.schemaVersion.formSchema FROM PredictionRun r
                    WHERE r.id IN :ids AND r.createdBy.id = :authorId AND r.schemaBookmark.id = :bookmarkId
                    ORDER BY r.createdAt DESC, r.id ASC
                    """, Object[].class).setParameter("ids", batch).setParameter("authorId", authorId)
                    .setParameter("bookmarkId", bookmarkId).getResultList();
            rows.stream().filter(row -> matches(row, search)).forEach(row -> matching.add((Long) row[0]));
        }
        return matching;
    }

    @SuppressWarnings("unchecked")
    private boolean matches(Object[] row, String search) {
        var inputs = PublicExampleInputs.of((Map<String, Object>) row[3], (Map<String, Object>) row[2]);
        return CatalogPages.contains(search, row[0], row[1], inputs);
    }
}
