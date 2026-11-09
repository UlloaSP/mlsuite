package dev.ulloasp.mlsuite.util;

import static dev.ulloasp.mlsuite.util.CatalogParameterFixture.Caller.ADMIN;
import static dev.ulloasp.mlsuite.util.CatalogParameterFixture.Caller.OWNER;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * The platform's catalogs, and the catalogs read from a JSON body, refuse a value they do not
 * offer with 400 and the same words as every other catalog.
 */
class AdminCatalogParameterValidationHttpTest extends CatalogParameterFixture {

    @Test
    void platformCatalogsRefuseUnknownValues() throws Exception {
        refusesUnknownValues(ADMIN, "/api/admin/users", "role");
        refusesUnknownValues(ADMIN, "/api/admin/users/owner-candidates/catalog", "filter");
        refusesUnknownValues(ADMIN, "/api/admin/public-bookmarks", null);
        refusesUnknownValues(ADMIN, "/api/admin/purges", "filter");
        refusesUnknownValues(ADMIN, "/api/admin/api-traffic/clients", "filter");
        refusesUnknownValues(ADMIN, "/api/admin/api-traffic/organizations", "filter");
        refusesUnknownValues(ADMIN, "/api/admin/audit-events/catalog", "filter");
        refusesUnknownValues(ADMIN, "/api/organizations/catalog", null);
        refused(as(ADMIN, get("/api/admin/audit-events/catalog").param("organization", "bogus")),
                "Unknown organization 'bogus'; expected one of: platform, <id>");
    }

    @Test
    void theValuesTheAdminPagesSendAreServed() throws Exception {
        mockMvc.perform(as(ADMIN, get("/api/admin/users").param("role", "SUPERADMIN").param("sort", "oldest")))
                .andExpect(status().isOk());
        mockMvc.perform(as(ADMIN, get("/api/admin/purges").param("filter", "completed")))
                .andExpect(status().isOk());
        mockMvc.perform(as(ADMIN, get("/api/admin/api-traffic/clients").param("filter", "suspended")
                .param("sort", "organization"))).andExpect(status().isOk());
        mockMvc.perform(as(ADMIN, get("/api/admin/audit-events/catalog").param("organization", "platform")))
                .andExpect(status().isOk());
    }

    @Test
    void theInferenceCatalogRefusesUnknownValuesInItsBody() throws Exception {
        String table = "/api/prediction-runs/catalog";
        mockMvc.perform(body(table, "{\"page\":0,\"size\":50,\"status\":\"FAILED\",\"origin\":\"PUBLIC\","
                + "\"feedback\":\"PENDING\",\"sort\":\"schema.asc\"}")).andExpect(status().isOk());
        mockMvc.perform(body(table + "/metadata", "{\"page\":0,\"size\":50,\"schemaId\":\"all\"}"))
                .andExpect(status().isOk());
        refused(body(table, "{\"status\":\"bogus\"}"),
                "Unknown status 'bogus'; expected one of: all, SUCCESS, PARTIAL_SUCCESS, FAILED");
        refused(body(table, "{\"feedback\":\"bogus\"}"),
                "Unknown feedback 'bogus'; expected one of: all, COMPLETED, PENDING, NOT_REQUIRED");
        refused(body(table, "{\"origin\":\"bogus\"}"),
                "Unknown origin 'bogus'; expected one of: all, WORKSPACE, PUBLIC, API");
        refused(body(table, "{\"sort\":\"bogus\"}"),
                "Unknown sort 'bogus'; expected <column>.asc or <column>.desc");
        refused(body(table, "{\"schemaId\":\"bogus\"}"), "Unknown schemaId 'bogus'; expected one of: all, <id>");
        refused(body(table, "{\"bookmarkId\":\"bogus\"}"),
                "Unknown bookmarkId 'bogus'; expected one of: all, unbookmarked, <id>");
        refused(body(table, "{\"conditions\":[{\"columnId\":\"age\",\"operator\":\"near\",\"value\":\"1\"}]}"),
                "Unknown condition operator 'near'; expected one of: is, contains, eq");
        refused(body(table, "{\"conditions\":[{\"operator\":\"eq\",\"value\":\"1\"}]}"),
                "Invalid condition; expected a columnId, an operator and a value");
        refused(body(table + "/selection", "{\"page\":-1}"), "Invalid page '-1'; expected 0 or more");
        refused(body(table, "{\"size\":0}"), "Invalid size '0'; expected 1 to 100");
    }

    @Test
    void theOptionCatalogsRefuseAnUnknownKindOrPage() throws Exception {
        String facets = "/api/prediction-runs/catalog/facets";
        mockMvc.perform(body(facets, "{\"kind\":\"schemas\",\"size\":24,\"scope\":{\"schemaId\":\"all\"}}"))
                .andExpect(status().isOk());
        refused(body(facets, "{\"kind\":\"bogus\",\"scope\":{}}"),
                "Unknown kind 'bogus'; expected one of: schemas, bookmarks, columns");
        refused(body(facets, "{\"kind\":\"schemas\",\"size\":0}"), "Invalid size '0'; expected 1 to 100");
        refused(body("/api/catalog-selection", "{\"kind\":\"bogus\"}"),
                "Unknown kind 'bogus'; expected one of: runs, reviewers, snapshots, bookmarks");
        refused(body("/api/catalog-selection", "{\"kind\":\"runs\",\"page\":-1}"),
                "Invalid page '-1'; expected 0 or more");
    }

    private MockHttpServletRequestBuilder body(String path, String json) {
        return as(OWNER, post(path).contentType(MediaType.APPLICATION_JSON).content(json));
    }
}
