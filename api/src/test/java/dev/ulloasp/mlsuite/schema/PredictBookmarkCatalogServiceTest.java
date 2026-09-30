package dev.ulloasp.mlsuite.schema;

import static org.mockito.Mockito.lenient;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static dev.ulloasp.mlsuite.schema.SchemaFlowFixtures.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository.BookmarkRunStats;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository.LatestSchemaVersion;
import dev.ulloasp.mlsuite.schema.application.dto.PredictBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.service.PredictBookmarkCatalogService;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

class PredictBookmarkCatalogServiceTest {

    private final WorkspaceAuthorizationService auth = mock(WorkspaceAuthorizationService.class);
    private final SchemaBookmarkRepository bookmarks = mock(SchemaBookmarkRepository.class);
    private final SchemaVersionRepository versions = mock(SchemaVersionRepository.class);
    private final SchemaModelBindingRepository bindings = mock(SchemaModelBindingRepository.class);
    private final PredictionRunRepository runs = mock(PredictionRunRepository.class);
    private PredictBookmarkCatalogService service;

    @BeforeEach
    void setUp() {
        lenient().when(auth.requireCurrent(eq(7L), any(PermissionKey[].class))).thenReturn(organization());
        service = new PredictBookmarkCatalogService(auth, bookmarks, versions, bindings, runs);
    }

    @Test
    void describesWhatEachBookmarkRunsAndHowItIsUsed() {
        SchemaBookmark used = bookmark();
        SchemaBookmark unused = new SchemaBookmark(schema(), used.getVersion(), "staging");
        unused.setId(71L);
        OffsetDateTime lastRun = OffsetDateTime.parse("2026-09-20T10:00:00Z");
        when(bookmarks.findActiveByOrganizationId(41L)).thenReturn(List.of(used, unused));
        when(runs.findBookmarkRunStats(41L)).thenReturn(List.of(stats(70L, 3, lastRun)));
        when(versions.findLatestVersions(41L)).thenReturn(List.of(latest(5L, 4)));
        when(bindings.findBySchemaVersionIdIn(Set.of(9L)))
                .thenReturn(List.of(binding(used.getVersion(), 11L), binding(used.getVersion(), 12L)));

        List<PredictBookmarkDto> catalog = service.listBookmarks(7L);

        PredictBookmarkDto production = catalog.get(0);
        assertEquals("Risk", production.schemaName());
        assertEquals(List.of("model-11", "model-12"), production.models());
        assertEquals(1, production.fieldCount());
        assertEquals(0, production.reportCount());
        assertEquals(1, production.version());
        assertEquals(4, production.latestVersion());
        assertEquals(3, production.runCount());
        assertEquals(lastRun, production.lastRunAt());
        assertEquals(0, catalog.get(1).runCount());
        assertNull(catalog.get(1).lastRunAt());
        verify(auth).requireCurrent(7L, PermissionKey.VIEW_MODELS);
    }

    @Test
    void anOrganizationWithoutBookmarksSkipsTheAggregates() {
        when(bookmarks.findActiveByOrganizationId(41L)).thenReturn(List.of());

        assertTrue(service.listBookmarks(7L).isEmpty());
        verifyNoInteractions(runs, versions, bindings);
    }

    private BookmarkRunStats stats(Long bookmarkId, long count, OffsetDateTime lastRunAt) {
        return new BookmarkRunStats() {
            public Long getBookmarkId() { return bookmarkId; }
            public long getRunCount() { return count; }
            public OffsetDateTime getLastRunAt() { return lastRunAt; }
        };
    }

    private LatestSchemaVersion latest(Long schemaId, int version) {
        return new LatestSchemaVersion() {
            public Long getSchemaId() { return schemaId; }
            public int getLatestVersion() { return version; }
        };
    }
}
