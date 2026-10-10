package dev.ulloasp.mlsuite.schema.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import java.util.stream.LongStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunOrigin;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

/** The inference catalog on PostgreSQL: counts, predicates, deterministic page boundaries and tenant scope. */
class InferenceCatalogIntegrationTest extends PublicPredictionFixture {
    @Autowired InferenceCatalogService catalog;
    private final OffsetDateTime at = OffsetDateTime.parse("2026-10-01T10:00:00Z");

    @BeforeEach
    void makeTheOwnerAMember() {
        authorizeOwner();
    }

    private InferenceCatalogRequest request(int page, String query, String sort, String status,
            List<InferenceCatalogRequest.Condition> conditions) {
        return new InferenceCatalogRequest(page, 24, query, String.valueOf(schema.getId()), "all", status, "all",
                "all", sort, "en-US", conditions);
    }

    private InferenceCatalogRequest everything(String query, String schemaId, String bookmarkId, String feedback,
            String origin) {
        return new InferenceCatalogRequest(0, 24, query, schemaId, bookmarkId, "all", feedback, origin,
                "createdAt.desc", "en-US", List.of());
    }

    private List<String> names(InferenceCatalogRequest request) {
        return catalog.page(owner.getId(), request).items().stream().map(row -> row.item().name()).sorted().toList();
    }

    private MockHttpServletRequestBuilder posting(String path, Object body) throws Exception {
        return signedIn(post(path).contentType(MediaType.APPLICATION_JSON)
                .content(body instanceof String text ? text : objectMapper.writeValueAsString(body)), owner.getId());
    }

    @Test
    void pagesAndScansAcrossEqualTimestampBoundariesWithoutLosingRowsOrTenantScope() throws Exception {
        long[] foreignId = { 0 };
        inTransaction(() -> {
            var foreignOrg = new Organization("foreign-" + schema.getId(), "Foreign", null, owner);
            entityManager.persist(foreignOrg);
            var foreignSchema = new Schema(foreignOrg, "Foreign", null);
            entityManager.persist(foreignSchema);
            var foreignVersion = new SchemaVersion(foreignSchema, 1, "Foreign",
                    Map.of("fields", List.of(), "reports", List.of()));
            entityManager.persist(foreignVersion);
            var foreignRun = new PredictionRun(null, foreignVersion, "foreign-only", Map.of("Age", 999),
                    PredictionRunStatus.SUCCESS);
            entityManager.persist(foreignRun);
            foreignId[0] = foreignRun.getId();
            for (int i = 0; i < 130; i++) {
                entityManager.persist(new PredictionRun(bookmark, version, "case-" + i, Map.of("Age", i),
                        i == 129 ? PredictionRunStatus.FAILED : PredictionRunStatus.SUCCESS));
            }
            entityManager
                    .createQuery("update PredictionRun r set r.createdAt = :at where r.schemaVersion.id = :version")
                    .setParameter("at", at).setParameter("version", version.getId()).executeUpdate();
        });
        String ageColumn = schema.getId() + ":input:Age";

        var first = catalog.page(owner.getId(), request(0, "", "createdAt.desc", "all", List.of()));
        var sixth = catalog.page(owner.getId(), request(5, "", "createdAt.desc", "all", List.of()));
        assertEquals(130, first.totalItems());
        assertTrue(first.hasNext());
        assertEquals(10, sixth.items().size());
        assertFalse(sixth.hasNext());
        assertEquals("case-0", first.items().getFirst().item().name());
        assertEquals("case-120", sixth.items().getFirst().item().name());
        var everyScope = everything("", "all", "all", "all", "all");
        assertEquals(130, catalog.page(owner.getId(), everyScope).totalItems());
        assertEquals(130, catalog.metadata(owner.getId(), everyScope).totalItems());
        var foreignSearch = everything("foreign-only", "all", "all", "all", "all");
        assertEquals(0, catalog.page(owner.getId(), foreignSearch).totalItems());
        assertTrue(catalog.selection(owner.getId(), foreignSearch).isEmpty());

        // A search scans and sorts in memory, and must hand out the same pages the database does.
        var scanned = new ArrayList<Long>();
        for (int page = 0; page < 6; page++) {
            var paged = catalog.page(owner.getId(), request(page, "", "createdAt.desc", "all", List.of()));
            var searched = catalog.page(owner.getId(), request(page, "CASE-", "createdAt.desc", "all", List.of()));
            assertEquals(130, searched.totalItems());
            assertEquals(page < 5, searched.hasNext());
            assertEquals(paged.items().stream().map(row -> row.item().id()).toList(),
                    searched.items().stream().map(row -> row.item().id()).toList(), "page " + page);
            searched.items().forEach(row -> scanned.add(row.item().id()));
        }
        assertEquals(130, new LinkedHashSet<>(scanned).size());
        // Derived and summary columns sort the whole result: by number, and by name with digit runs by value.
        var sorted = new ArrayList<String>();
        for (int page = 0; page < 6; page++) {
            var byAge = catalog.page(owner.getId(), request(page, "", ageColumn + ".desc", "all", List.of()));
            var byName = catalog.page(owner.getId(), request(page, "", "name.asc", "all", List.of()));
            assertEquals(130, byAge.totalItems());
            assertEquals(page < 5, byAge.hasNext());
            assertEquals("case-" + (129 - 24 * page), byAge.items().getFirst().item().name());
            assertEquals(page < 5 ? 24 : 10, byName.items().size());
            assertEquals(page < 5, byName.hasNext());
            byName.items().forEach(row -> sorted.add(row.item().name()));
        }
        assertEquals(IntStream.range(0, 130).mapToObj(i -> "case-" + i).toList(), sorted);
        assertTrue(catalog.page(owner.getId(), request(6, "", "name.asc", "all", List.of())).items().isEmpty());

        var ids = catalog.selection(owner.getId(), everyScope).stream().map(item -> item.id()).toList();
        var selection = Map.of("kind", "runs", "ids", ids, "size", 24);
        mockMvc.perform(posting("/api/catalog-selection", selection))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(130))
                .andExpect(jsonPath("$.items.length()").value(24));
        mockMvc.perform(posting("/api/catalog-selection/ids", selection))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(130));
        mockMvc.perform(posting("/api/catalog-selection", Map.of("kind", "snapshots", "ids", ids)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].id").value(schema.getId() + ":" + version.getId()))
                .andExpect(jsonPath("$.items[0].title").value("Cardio risk · Baseline · v3"));
        mockMvc.perform(posting("/api/catalog-selection", Map.of("kind", "runs", "ids", List.of(foreignId[0]))))
                .andExpect(status().isNotFound());
        mockMvc.perform(posting("/api/catalog-selection", "{\"kind\":\"runs\",\"ids\":[9223372036854775807]}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(posting("/api/catalog-selection", "{\"kind\":\"runs\",\"ids\":[null]}"))
                .andExpect(status().isBadRequest());
        // More ids than one statement can bind are read in batches, and a missing one is still found missing.
        var unknown = new ArrayList<>(ids);
        LongStream.range(0, 70_000).forEach(offset -> unknown.add(4_000_000_000L + offset));
        mockMvc.perform(posting("/api/catalog-selection", Map.of("kind", "runs", "ids", unknown)))
                .andExpect(status().isNotFound());

        var failed = catalog.page(owner.getId(), request(0, "", "createdAt.desc", "FAILED", List.of()));
        assertEquals(1, failed.totalItems());
        assertEquals("case-129", failed.items().getFirst().item().name());
        var age = new InferenceCatalogRequest.Condition(ageColumn, "gt", "125");
        var derived = catalog.page(owner.getId(), request(0, "", ageColumn + ".desc", "all", List.of(age)));
        assertEquals(4, derived.totalItems());
        assertEquals("case-129", derived.items().getFirst().item().name());
        assertEquals(4, catalog.selection(owner.getId(), request(0, "", "createdAt.desc", "all", List.of(age))).size());
        var metadata = catalog.metadata(owner.getId(), request(0, "", "createdAt.desc", "all", List.of()));
        assertEquals(130, metadata.totalItems());
        assertTrue(metadata.columns().stream().anyMatch(column -> column.id().endsWith(":input:Age")
                && column.choices().size() == 51 && column.kind().name().equals("number")));
        mockMvc.perform(posting("/api/prediction-runs/catalog",
                "{\"page\":0,\"size\":1,\"schemaId\":\"" + schema.getId() + "\",\"status\":\"FAILED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].item.name").value("case-129"));
        mockMvc.perform(post("/api/prediction-runs/catalog").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(posting("/api/prediction-runs/catalog/facets", "{\"kind\":\"schemas\",\"scope\":{}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].value").value(schema.getId().toString()));
    }

    @Test
    void readsOnlyTheRunsInScopeAndFiltersByFeedbackOriginAndBookmark() {
        long[] other = { 0, 0 };
        inTransaction(() -> {
            var otherSchema = new Schema(organization, "Appetite", null);
            entityManager.persist(otherSchema);
            var otherVersion = new SchemaVersion(otherSchema, 4, "Second", Map.of(
                    "fields", List.of(Map.of("kind", "number", "label", "Weight")),
                    "reports", List.of(Map.of("kind", "regressor", "label", "Score",
                            "mappedTo", Map.of("risk-net", "score")))));
            entityManager.persist(otherVersion);
            entityManager.persist(new SchemaModelBinding(otherVersion, onnxModel, Map.of()));
            other[0] = otherSchema.getId();
            other[1] = otherVersion.getId();
            for (int i = 0; i < 3; i++) {
                entityManager.persist(new PredictionRun(bookmark, version, "shared-main-" + i, Map.of("Age", i),
                        PredictionRunStatus.SUCCESS));
            }
            var output = Map.<String, Object>of("reports", List.of(Map.of("mappedTo", "score", "value", 41.5)));
            var reviewed = new PredictionRun(null, otherVersion, "shared-reviewed", Map.of("Weight", 70),
                    PredictionRunStatus.SUCCESS);
            entityManager.persist(reviewed);
            var result = new PredictionResult(reviewed, onnxModel, Map.of(), output, PredictionResultStatus.SUCCESS,
                    null, null);
            entityManager.persist(result);
            entityManager.persist(new PredictionResultFeedback(result, owner, PredictionResultFeedbackType.OUTPUT, 0,
                    objectMapper.valueToTree(Map.of("output-feedback-assessment", 40))));
            var pending = new PredictionRun(null, otherVersion, "shared-pending", Map.of("Weight", 80),
                    PredictionRunStatus.SUCCESS);
            entityManager.persist(pending);
            entityManager.persist(new PredictionResult(pending, onnxModel, Map.of(), output,
                    PredictionResultStatus.SUCCESS, null, null));
            var visitorRun = new PredictionRun(null, otherVersion, "shared-public", Map.of("Weight", 90),
                    PredictionRunStatus.SUCCESS);
            visitorRun.setOrigin(PredictionRunOrigin.PUBLIC);
            entityManager.persist(visitorRun);
        });
        String main = String.valueOf(schema.getId());
        String appetite = String.valueOf(other[0]);
        String production = String.valueOf(bookmark.getId());
        var mainRuns = List.of("shared-main-0", "shared-main-1", "shared-main-2");
        var appetiteRuns = List.of("shared-pending", "shared-public", "shared-reviewed");

        // With and without a search: the database pages one, a scan the other, and both read only the scope.
        for (String query : List.of("", "shared")) {
            assertEquals(mainRuns, names(everything(query, main, "all", "all", "all")));
            assertEquals(appetiteRuns, names(everything(query, appetite, "all", "all", "all")));
            assertEquals(6, catalog.page(owner.getId(), everything(query, "all", "all", "all", "all")).totalItems());
            assertEquals(appetiteRuns, names(everything(query, "all", "unbookmarked", "all", "all")));
            assertEquals(mainRuns, names(everything(query, "all", production, "all", "all")));
            assertEquals(List.of(), names(everything(query, appetite, production, "all", "all")));
            assertEquals(List.of("shared-public"), names(everything(query, "all", "all", "all", "PUBLIC")));
            assertEquals(5,
                    catalog.page(owner.getId(), everything(query, "all", "all", "all", "WORKSPACE")).totalItems());
            assertEquals(List.of(), names(everything(query, "not-a-schema", "all", "all", "all")));
        }
        assertEquals(List.of("shared-reviewed"), names(everything("", "all", "all", "COMPLETED", "all")));
        assertEquals(List.of("shared-pending"), names(everything("", "all", "all", "PENDING", "all")));
        assertEquals(List.of("shared-public"), names(everything("", "all", "all", "NOT_REQUIRED", "all")));
        assertEquals(mainRuns, names(everything("", "all", "all", "ERROR", "all")));
        assertEquals(List.of(), names(everything("", main, "all", "COMPLETED", "all")));
        assertEquals(1,
                catalog.selection(owner.getId(), everything("", "all", "unbookmarked", "PENDING", "all")).size());

        var reviewed = catalog.page(owner.getId(), everything("shared-reviewed", "all", "all", "all", "all"))
                .items().getFirst();
        String answer = appetite + ":" + other[1] + ":feedback:OUTPUT:0:output-feedback-assessment:" + owner.getId();
        assertEquals(Map.of(appetite + ":input:Weight", 70, appetite + ":output:" + onnxModel.getId() + ":score", 41.5,
                answer, "40"), reviewed.values());
        assertEquals(InferenceFeedbackStatus.COMPLETED, reviewed.feedbackStatus());

        var metadata = catalog.metadata(owner.getId(), everything("", appetite, "all", "all", "all"));
        assertEquals(6, metadata.totalItems());
        assertEquals(List.of("Weight", "Score", "Score · Second · v4 · Assessment · " + owner.getEmail()),
                metadata.columns().stream().map(InferenceCatalogColumnDto::label).toList());
        assertTrue(metadata.columns().stream().allMatch(column -> column.schemaName().equals("Appetite")));
        assertEquals(List.of(new InferenceCatalogMetadataDto.Option(appetite, "Appetite"),
                new InferenceCatalogMetadataDto.Option(main, "Cardio risk")), metadata.schemas());
        assertEquals(List.of(), metadata.bookmarks());
        var unbookmarkedMain = catalog.metadata(owner.getId(), everything("", main, "unbookmarked", "all", "all"));
        assertEquals(List.of(new InferenceCatalogMetadataDto.Option(production, "production")),
                unbookmarkedMain.bookmarks());
        assertEquals(List.of(), unbookmarkedMain.columns());
    }
}
