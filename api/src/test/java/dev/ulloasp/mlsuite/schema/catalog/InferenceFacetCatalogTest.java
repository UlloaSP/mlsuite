package dev.ulloasp.mlsuite.schema.catalog;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

class InferenceFacetCatalogTest extends PublicPredictionFixture {
    private RoleDefinition role;
    private Long lastSchemaId;
    private Long lastBookmarkId;

    @BeforeEach
    void manyPersistedFacets() {
        role = authorizeOwner();
        inTransaction(() -> {
            for (int i = 0; i < 30; i++) {
                Schema s = new Schema(organization, "Schema %02d".formatted(i), null);
                entityManager.persist(s);
                SchemaVersion v = new SchemaVersion(s, 1, "First", Map.of("fields",
                        IntStream.range(0, 30).mapToObj(n -> Map.of("kind", "number", "label", "Field %02d".formatted(n)))
                                .toList()));
                entityManager.persist(v);
                SchemaBookmark b = new SchemaBookmark(s, v, "Bookmark %02d".formatted(i));
                entityManager.persist(b);
                entityManager.persist(new PredictionRun(b, v, "Run", Map.of(), PredictionRunStatus.SUCCESS));
                lastSchemaId = s.getId();
                lastBookmarkId = b.getId();
            }
            Organization foreign = new Organization("foreign-facets-" + schema.getId(), "Foreign", null, owner);
            entityManager.persist(foreign);
            Schema other = new Schema(foreign, "Foreign schema", null);
            entityManager.persist(other);
            SchemaVersion v = new SchemaVersion(other, 1, "Other", Map.of());
            entityManager.persist(v);
            entityManager.persist(new PredictionRun(null, v, "Outside", Map.of(), PredictionRunStatus.SUCCESS));
        });
    }

    @Test
    void schemasAndBookmarksArePagedAndSearchedBeyondTheFirstPageWithinTheWorkspace() throws Exception {
        mockMvc.perform(request("schemas", "", 1, Map.of()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(30))
                .andExpect(jsonPath("$.items.length()").value(6)).andExpect(jsonPath("$.hasNext").value(false));
        mockMvc.perform(request("schemas", "SCHEMA 29", 0, Map.of()))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].value").value(lastSchemaId.toString()));
        mockMvc.perform(request("schemas", "foreign", 0, Map.of()))
                .andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(request("bookmarks", "BOOKMARK 29", 0, Map.of("schemaId", lastSchemaId.toString())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].value").value(lastBookmarkId.toString()));
        mockMvc.perform(request("bookmarks", "Bookmark 28", 0, Map.of("schemaId", lastSchemaId.toString())))
                .andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(request("schemas", "%", 0, Map.of()))
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void dynamicColumnsSearchTheWholeSnapshotAndRejectUnknownFacetsAndUnauthorizedCallers() throws Exception {
        Map<String, String> scope = Map.of("schemaId", lastSchemaId.toString());
        mockMvc.perform(request("columns", "Field 29", 0, scope))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].label").value("Field 29 · Schema 29"));
        mockMvc.perform(request("columns", "Field", 1, scope))
                .andExpect(jsonPath("$.items.length()").value(6));
        mockMvc.perform(request("unknown", "", 0, Map.of())).andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/prediction-runs/catalog/facets").contentType(MediaType.APPLICATION_JSON)
                .content("{\"kind\":\"schemas\"}")).andExpect(status().isUnauthorized());
        inTransaction(() -> entityManager.find(RoleDefinition.class, role.getId())
                .setPermissions(EnumSet.of(PermissionKey.VIEW_MEMBERS)));
        mockMvc.perform(request("schemas", "", 0, Map.of())).andExpect(status().isForbidden());
    }

    private MockHttpServletRequestBuilder request(String kind, String search, int page, Map<?, ?> scope)
            throws Exception {
        return signedIn(post("/api/prediction-runs/catalog/facets").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("kind", kind, "search", search,
                        "page", page, "size", 24, "scope", scope))), owner.getId());
    }
}
