package dev.ulloasp.mlsuite.schema;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.EnumSet;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

class PredictBookmarkCatalogTest extends PublicPredictionFixture {
    private RoleDefinition role;
    private Long lastId;
    private static final String PATH = "/api/schema-bookmarks/catalog";

    @BeforeEach
    void manyBookmarks() {
        role = authorizeOwner();
        inTransaction(() -> {
            SchemaVersion newer = new SchemaVersion(schema, 4, "Latest", Map.of());
            entityManager.persist(newer);
            for (int i = 0; i < 30; i++) {
                SchemaBookmark b = new SchemaBookmark(schema, i == 29 ? newer : version, "Bookmark %02d".formatted(i));
                entityManager.persist(b);
                if (i == 29) {
                    lastId = b.getId();
                    for (int n = 0; n < 2; n++) entityManager.persist(new PredictionRun(b, newer, "Case " + n,
                            Map.of(), PredictionRunStatus.SUCCESS));
                }
            }
        });
    }

    @Test
    void databasePagesSearchesAndOrdersUsingGlobalUsageAndSnapshotStatistics() throws Exception {
        mockMvc.perform(signedIn(get(PATH).param("size", "24").param("page", "1"), owner.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(31))
                .andExpect(jsonPath("$.items.length()").value(7)).andExpect(jsonPath("$.hasNext").value(false));
        mockMvc.perform(signedIn(get(PATH).param("search", "BOOKMARK 29"), owner.getId()))
                .andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].id").value(lastId))
                .andExpect(jsonPath("$.items[0].runCount").value(2)).andExpect(jsonPath("$.items[0].latestVersion").value(4));
        for (String sort : new String[] { "used", "recent" }) {
            mockMvc.perform(signedIn(get(PATH).param("sort", sort).param("size", "1"), owner.getId()))
                    .andExpect(jsonPath("$.items[0].id").value(lastId));
        }
        mockMvc.perform(signedIn(get(PATH).param("filter", "outdated"), owner.getId()))
                .andExpect(jsonPath("$.totalItems").value(30));
        mockMvc.perform(signedIn(get(PATH).param("search", "%"), owner.getId()))
                .andExpect(jsonPath("$.totalItems").value(0));
        inTransaction(() -> entityManager.find(RoleDefinition.class, role.getId())
                .setPermissions(EnumSet.of(PermissionKey.VIEW_MEMBERS)));
        mockMvc.perform(signedIn(get(PATH), owner.getId())).andExpect(status().isForbidden());
    }
}
