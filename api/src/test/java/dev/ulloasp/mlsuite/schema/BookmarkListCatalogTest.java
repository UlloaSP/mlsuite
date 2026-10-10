package dev.ulloasp.mlsuite.schema;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmarkExample;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

/** One bookmark's statistics, its example of one run and its example catalogs, on PostgreSQL. */
class BookmarkListCatalogTest extends PublicPredictionFixture {
    private RoleDefinition ownerRole;
    private SchemaBookmark moved;
    private PredictionRun marked;
    private PredictionRun unmarked;

    /**
     * The public bookmark has three runs, "Case A" and "Case B" marked as examples. "moved" has no
     * runs and pins a newer snapshot than the run marked as its example.
     */
    @BeforeEach
    void runsAndExamples() {
        ownerRole = authorizeOwner();
        inTransaction(() -> {
            marked = run("Case A");
            entityManager.persist(new SchemaBookmarkExample(bookmark, marked));
            entityManager.persist(new SchemaBookmarkExample(bookmark, run("Case B")));
            unmarked = run("Case C");
            SchemaVersion newer = new SchemaVersion(schema, 9, "Newer", Map.of("fields", List.of()));
            entityManager.persist(newer);
            moved = new SchemaBookmark(schema, newer, "moved");
            entityManager.persist(moved);
            entityManager.persist(new SchemaBookmarkExample(moved, marked));
        });
    }

    @Test
    void exampleStatusAnswersForOneRunWhetherItIsMarked() throws Exception {
        String examples = "/api/schema-bookmarks/" + bookmark.getId() + "/examples/";
        mockMvc.perform(asOwner(get(examples + marked.getId() + "/status")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.example.runId").value(marked.getId()))
                .andExpect(jsonPath("$.example.runName").value("Case A"))
                .andExpect(jsonPath("$.example.status").value("SERVED"));
        mockMvc.perform(asOwner(get(examples + unmarked.getId() + "/status")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.example").value(nullValue()));
        mockMvc.perform(asOwner(get("/api/schema-bookmarks/" + moved.getId() + "/examples/" + marked.getId()
                + "/status")))
                .andExpect(jsonPath("$.example.status").value("BOOKMARK_MOVED"));
        mockMvc.perform(asOwner(get("/api/schema-bookmarks/0/examples/" + marked.getId() + "/status")))
                .andExpect(status().isNotFound());

        withoutViewModels();
        mockMvc.perform(asOwner(get(examples + marked.getId() + "/status"))).andExpect(status().isForbidden());
    }

    @Test
    void statisticsDescribeOneBookmarkAndHowMuchItIsUsed() throws Exception {
        mockMvc.perform(asOwner(get("/api/schema-bookmarks/" + bookmark.getId() + "/statistics")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(bookmark.getId()))
                .andExpect(jsonPath("$.name").value("production"))
                .andExpect(jsonPath("$.schemaName").value("Cardio risk"))
                .andExpect(jsonPath("$.version").value(3))
                .andExpect(jsonPath("$.latestVersion").value(9))
                .andExpect(jsonPath("$.models.length()").value(2))
                .andExpect(jsonPath("$.fieldCount").value(3))
                .andExpect(jsonPath("$.reportCount").value(2))
                .andExpect(jsonPath("$.runCount").value(3))
                .andExpect(jsonPath("$.lastRunAt").isString());
        mockMvc.perform(asOwner(get("/api/schema-bookmarks/" + moved.getId() + "/statistics")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(9))
                .andExpect(jsonPath("$.models.length()").value(0))
                .andExpect(jsonPath("$.runCount").value(0))
                .andExpect(jsonPath("$.lastRunAt").value(nullValue()));
        mockMvc.perform(asOwner(get("/api/schema-bookmarks/0/statistics"))).andExpect(status().isNotFound());

        // Like the bookmark list it replaces, it leaves out the bookmarks of an archived schema.
        inTransaction(() -> entityManager.find(Schema.class, schema.getId()).setArchivedAt(OffsetDateTime.now()));
        mockMvc.perform(asOwner(get("/api/schema-bookmarks/" + bookmark.getId() + "/statistics")))
                .andExpect(status().isNotFound());
        withoutViewModels();
        mockMvc.perform(asOwner(get("/api/schema-bookmarks/" + bookmark.getId() + "/statistics")))
                .andExpect(status().isForbidden());
    }

    @Test
    void exampleCatalogsSearchByRunNameAndThePublicOneServesOnlyServedExamples() throws Exception {
        String workspace = "/api/schema-bookmarks/" + bookmark.getId() + "/examples/catalog";
        mockMvc.perform(asOwner(get(workspace).param("size", "1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.items[0].runName").value("Case A"))
                .andExpect(jsonPath("$.hasNext").value(true));
        mockMvc.perform(asOwner(get(workspace).param("search", "case b")))
                .andExpect(jsonPath("$.totalItems").value(1));
        mockMvc.perform(asOwner(get(workspace).param("filter", "bookmark_moved")))
                .andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(asOwner(get("/api/schema-bookmarks/" + moved.getId() + "/examples/catalog")
                .param("filter", "bookmark_moved")))
                .andExpect(jsonPath("$.totalItems").value(1));

        String publicPage = "/api/public/bookmarks/" + bookmark.getPublicId() + "/examples/catalog";
        mockMvc.perform(get(publicPage))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.items[0].name").value("Case A"));
        mockMvc.perform(get(publicPage).param("search", "CASE B")).andExpect(jsonPath("$.totalItems").value(1));
        mockMvc.perform(get("/api/public/bookmarks/unknown/examples/catalog")).andExpect(status().isNotFound());
    }

    private PredictionRun run(String name) {
        PredictionRun run = new PredictionRun(bookmark, version, name, Map.of("Age", 40), PredictionRunStatus.SUCCESS);
        entityManager.persist(run);
        return run;
    }

    private void withoutViewModels() {
        inTransaction(() -> entityManager.find(RoleDefinition.class, ownerRole.getId())
                .setPermissions(EnumSet.of(PermissionKey.VIEW_MEMBERS)));
    }

    private MockHttpServletRequestBuilder asOwner(MockHttpServletRequestBuilder request) {
        return signedIn(request, owner.getId());
    }
}
