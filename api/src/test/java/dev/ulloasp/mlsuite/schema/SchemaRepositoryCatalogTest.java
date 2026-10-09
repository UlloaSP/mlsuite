package dev.ulloasp.mlsuite.schema;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmarkExample;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraftStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

/** A schema's snapshots, changes and bookmarks, filtered, searched, ordered and paged on PostgreSQL. */
class SchemaRepositoryCatalogTest extends PublicPredictionFixture {
    private static final Map<String, Object> FIELD = Map.of("kind", "number", "label", "Value");
    private static final Map<String, Object> HIDDEN = Map.of("kind", "number", "label", "Secret", "hidden", true);

    private RoleDefinition ownerRole;
    private SchemaVersion first;
    private SchemaVersion latest;

    /**
     * Beside the fixture's "Baseline" v3 (three fields, two models): an unnamed v1 with one visible
     * field, "alpha" v2 without fields but with a model, "Zulu" v4 with five fields, and "Bulk 05"
     * to "Bulk 34", one field each. All are given one creation time, which leaves ties to the id.
     */
    @BeforeEach
    void thirtyFourSnapshots() {
        ownerRole = authorizeOwner();
        inTransaction(() -> {
            first = snapshot(1, null, List.of(FIELD, HIDDEN));
            entityManager.persist(new SchemaModelBinding(snapshot(2, "alpha", List.of()), onnxModel, Map.of()));
            snapshot(4, "Zulu", List.of(FIELD, FIELD, FIELD, FIELD, FIELD));
            IntStream.rangeClosed(5, 34).forEach(number -> latest = snapshot(number, "Bulk %02d".formatted(number),
                    List.of(FIELD)));
            entityManager.createQuery("update SchemaVersion v set v.createdAt = :at where v.schema.id = :schema")
                    .setParameter("at", OffsetDateTime.parse("2026-10-01T10:00:00Z"))
                    .setParameter("schema", schema.getId())
                    .executeUpdate();
        });
    }

    @Test
    void snapshotsFilterSearchWhatACardShowsAndOrderInTheDatabase() throws Exception {
        catalog("versions", "size", "24")
                .andExpect(jsonPath("$.totalItems").value(34))
                .andExpect(jsonPath("$.items.length()").value(24))
                .andExpect(jsonPath("$.hasNext").value(true))
                .andExpect(jsonPath("$.items[0].id").value(version.getId()));
        catalog("versions", "size", "24", "page", "1", "sort", "name")
                .andExpect(jsonPath("$.items.length()").value(10))
                .andExpect(jsonPath("$.hasNext").value(false))
                // An unnamed snapshot is ordered by the "v1" its card shows.
                .andExpect(jsonPath("$.items[8].version").value(1))
                .andExpect(jsonPath("$.items[9].name").value("Zulu"));
        catalog("versions", "sort", "name")
                .andExpect(jsonPath("$.items[0].name").value("alpha"))
                .andExpect(jsonPath("$.items[1].name").value("Baseline"));
        catalog("versions", "sort", "version").andExpect(jsonPath("$.items[0].version").value(34));

        catalog("versions", "filter", "latest")
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].version").value(34));
        catalog("versions", "filter", "withBindings").andExpect(jsonPath("$.totalItems").value(2));
        catalog("versions", "filter", "unknown").andExpect(jsonPath("$.totalItems").value(0));

        catalog("versions", "search", "BASELINE")
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].bindings.length()").value(2))
                .andExpect(jsonPath("$.items[0].formSchema.fields.length()").value(3));
        catalog("versions", "search", "v3").andExpect(jsonPath("$.totalItems").value(6));
        catalog("versions", "search", "3 fields").andExpect(jsonPath("$.totalItems").value(1));
        catalog("versions", "search", "0 fields").andExpect(jsonPath("$.items[0].name").value("alpha"));
        catalog("versions", "search", "5 fields").andExpect(jsonPath("$.items[0].name").value("Zulu"));
        // The hidden field of v1 is not counted, so it is found with the thirty one-field snapshots.
        catalog("versions", "search", "1 fields").andExpect(jsonPath("$.totalItems").value(31));
        catalog("versions", "search", "%").andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void changesLeaveOutPublishedOnesAndCarryTheNameOfTheirBaseSnapshot() throws Exception {
        inTransaction(() -> {
            IntStream.range(0, 26).forEach(number -> change("Change %02d".formatted(number), version,
                    SchemaDraftStatus.DRAFT));
            change("Stuck", first, SchemaDraftStatus.CONFLICT);
            change("Shipped", version, SchemaDraftStatus.PUBLISHED);
        });

        catalog("drafts", "size", "24", "sort", "name")
                .andExpect(jsonPath("$.totalItems").value(27))
                .andExpect(jsonPath("$.items.length()").value(24))
                .andExpect(jsonPath("$.items[0].draft.name").value("Change 00"))
                .andExpect(jsonPath("$.items[0].baseSnapshotName").value("Baseline"));
        catalog("drafts", "size", "24", "page", "1", "sort", "base")
                .andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.items[2].draft.name").value("Stuck"))
                .andExpect(jsonPath("$.items[2].draft.baseVersion").value(1))
                .andExpect(jsonPath("$.items[2].baseSnapshotName").value(nullValue()));
        catalog("drafts", "filter", "open").andExpect(jsonPath("$.totalItems").value(27));
        catalog("drafts", "filter", "draft").andExpect(jsonPath("$.totalItems").value(26));
        catalog("drafts", "filter", "CONFLICT").andExpect(jsonPath("$.totalItems").value(1));
        catalog("drafts", "filter", "published").andExpect(jsonPath("$.totalItems").value(0));
        catalog("drafts", "filter", "unknown").andExpect(jsonPath("$.totalItems").value(0));
        catalog("drafts", "search", "change 2").andExpect(jsonPath("$.totalItems").value(6));
        // A status is searched as the text its badge shows.
        catalog("drafts", "search", "confl").andExpect(jsonPath("$.items[0].draft.name").value("Stuck"));
        catalog("drafts", "search", "shipped").andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void bookmarksFilterByTheNewestSnapshotAndCountExamplesOfThePageOnly() throws Exception {
        inTransaction(() -> {
            IntStream.range(0, 25).forEach(number -> entityManager.persist(
                    new SchemaBookmark(schema, latest, "mark-%02d".formatted(number))));
            entityManager.persist(new SchemaBookmark(schema, first, "legacy"));
            PredictionRun run = new PredictionRun(bookmark, version, "example", Map.of(), PredictionRunStatus.SUCCESS);
            entityManager.persist(run);
            entityManager.persist(new SchemaBookmarkExample(bookmark, run));
        });

        catalog("bookmarks", "size", "24", "sort", "name")
                .andExpect(jsonPath("$.totalItems").value(27))
                .andExpect(jsonPath("$.items.length()").value(24))
                .andExpect(jsonPath("$.items[0].name").value("legacy"))
                .andExpect(jsonPath("$.items[1].name").value("mark-00"));
        catalog("bookmarks", "size", "24", "page", "1", "sort", "version")
                .andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.items[1].version").value(3))
                .andExpect(jsonPath("$.items[2].version").value(1));
        catalog("bookmarks", "filter", "latest").andExpect(jsonPath("$.totalItems").value(25));
        catalog("bookmarks", "filter", "older").andExpect(jsonPath("$.totalItems").value(2));
        catalog("bookmarks", "filter", "unknown").andExpect(jsonPath("$.totalItems").value(0));
        catalog("bookmarks", "search", "PRODUCTION")
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].exampleCount").value(1));
        catalog("bookmarks", "search", "v3").andExpect(jsonPath("$.totalItems").value(26));
        catalog("bookmarks", "search", "_").andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void aSchemaOfAnotherOrganizationIsNotFoundAndReadingNeedsViewModels() throws Exception {
        for (String resource : List.of("versions", "drafts", "bookmarks")) {
            mockMvc.perform(asOwner(get("/api/schemas/0/" + resource + "/catalog"))).andExpect(status().isNotFound());
        }
        inTransaction(() -> entityManager.find(RoleDefinition.class, ownerRole.getId())
                .setPermissions(EnumSet.of(PermissionKey.VIEW_MEMBERS)));
        for (String resource : List.of("versions", "drafts", "bookmarks")) {
            mockMvc.perform(asOwner(get("/api/schemas/" + schema.getId() + "/" + resource + "/catalog")))
                    .andExpect(status().isForbidden());
        }
    }

    private SchemaVersion snapshot(int number, String name, List<Map<String, Object>> fields) {
        SchemaVersion snapshot = new SchemaVersion(schema, number, name,
                Map.of("fields", fields, "reports", List.of()));
        entityManager.persist(snapshot);
        return snapshot;
    }

    private void change(String name, SchemaVersion base, SchemaDraftStatus status) {
        SchemaDraft draft = new SchemaDraft(schema, base, name, base.getFormSchema(), List.of());
        draft.setStatus(status);
        entityManager.persist(draft);
    }

    /** One page of a schema's resource as its owner, with {@code parameters} as name and value pairs. */
    private ResultActions catalog(String resource, String... parameters) throws Exception {
        MockHttpServletRequestBuilder request = get("/api/schemas/" + schema.getId() + "/" + resource + "/catalog");
        for (int index = 0; index < parameters.length; index += 2) {
            request.param(parameters[index], parameters[index + 1]);
        }
        return mockMvc.perform(asOwner(request)).andExpect(status().isOk());
    }

    private MockHttpServletRequestBuilder asOwner(MockHttpServletRequestBuilder request) {
        return signedIn(request, owner.getId());
    }
}
