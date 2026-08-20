package dev.ulloasp.mlsuite.search;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.search.application.dto.SearchResponseDto;
import dev.ulloasp.mlsuite.search.application.usecase.SearchWorkspaceService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class SearchWorkspaceSchemaArtifactsTest {

    @Mock private WorkspaceAccessService access;
    @Mock private WorkspaceAuthorizationService authorization;
    @Mock private OrganizationMembershipRepository memberships;
    @Mock private ModelRepository models;
    @Mock private SchemaRepository schemas;
    @Mock private SchemaVersionRepository versions;
    @Mock private SchemaBookmarkRepository bookmarks;
    @Mock private PredictionRunRepository runs;
    @Mock private PluginMetadataRepository plugins;

    private SearchWorkspaceService service;

    @BeforeEach
    void setUp() {
        service = new SearchWorkspaceService(
                access,
                authorization,
                memberships,
                models,
                schemas,
                versions,
                bookmarks,
                runs,
                plugins);
    }

    @Test
    void search_ReturnsSnapshotsAndBookmarksAsSeparateGroups() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setName("Acme");
        Schema schema = new Schema(organization, "Risk schema", null);
        schema.setId(31L);
        SchemaVersion version = new SchemaVersion(schema, 4, "Release candidate", java.util.Map.of());
        version.setId(51L);
        version.setCreatedAt(OffsetDateTime.parse("2026-07-27T10:00:00Z"));
        SchemaBookmark bookmark = new SchemaBookmark(schema, version, "Release production");
        bookmark.setId(61L);
        bookmark.setUpdatedAt(OffsetDateTime.parse("2026-07-27T11:00:00Z"));
        when(access.requireCurrentOrganization(7L)).thenReturn(organization);
        when(versions.searchByOrganizationId(eq(41L), eq("release"), any(Pageable.class)))
                .thenReturn(List.of(version));
        when(bookmarks.searchByOrganizationId(eq(41L), eq("release"), any(Pageable.class)))
                .thenReturn(List.of(bookmark));

        SearchResponseDto response = service.search(7L, "release");

        assertEquals(List.of("Snapshots", "Bookmarks"),
                response.groups().stream().map(group -> group.label()).toList());
        assertEquals("snapshot", response.groups().get(0).results().getFirst().type());
        assertEquals("/schemas/31/versions/51", response.groups().get(0).results().getFirst().href());
        assertEquals("bookmark", response.groups().get(1).results().getFirst().type());
        assertEquals("/schemas/31/bookmarks/61", response.groups().get(1).results().getFirst().href());
    }
}
