package dev.ulloasp.mlsuite.plugin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.OffsetDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.util.CatalogPages;

/** The plugin catalog query on PostgreSQL: what it filters, counts and orders before it pages. */
class PluginCatalogQueryTest extends PublicPredictionFixture {
    @Autowired PluginMetadataRepository plugins;

    @Test
    void filtersCountsAndBreaksTiesBeforePaging() {
        OffsetDateTime at = OffsetDateTime.parse("2026-10-01T10:00:00Z");
        inTransaction(() -> {
            for (int i = 0; i < 30; i++) {
                String id = "catalog-" + schema.getId() + "-" + String.format("%02d", i);
                entityManager.persist(new PluginMetadata(id, organization, "objects/" + i, "same.ts",
                        "text/typescript", 1, at, at, owner, i < 29 ? "field" : "report", "same"));
            }
        });

        Page<PluginMetadata> second = page("field", "SAME", "name", 1);
        assertEquals(29, second.getTotalElements());
        assertEquals(5, second.getNumberOfElements());
        assertTrue(second.getContent().getFirst().getId().endsWith("-24"));
        assertEquals(1, plugins.countByOrganizationIdAndPluginType(organization.getId(), "report"));
        assertEquals(30, page("all", "", "updated", 0).getTotalElements());
        // Wildcard characters in a search are matched literally.
        assertEquals(0, page("field", "%", "updated", 0).getTotalElements());
        assertEquals(0, page("field", "_", "updated", 0).getTotalElements());
        assertEquals(0, page("field", "absent", "updated", 0).getTotalElements());
    }

    private Page<PluginMetadata> page(String type, String search, String sort, int page) {
        return plugins.findCatalogPage(organization.getId(), type, CatalogPages.likeLiteral(search), sort,
                PageRequest.of(page, 24));
    }
}
