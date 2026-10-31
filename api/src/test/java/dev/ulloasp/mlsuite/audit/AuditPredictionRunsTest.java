package dev.ulloasp.mlsuite.audit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.security.identity.ClientNetworks;

/**
 * Every prediction run gets one entry, whoever ran it, and it never holds what ran through the
 * model. Clients of the API are covered with the rest of that surface (ApiPredictionTest).
 */
class AuditPredictionRunsTest extends PublicPredictionFixture {

    @Autowired JdbcTemplate jdbc;

    @Test
    void aMembersRunIsOneEntryUnderTheirName() throws Exception {
        authorizeOwner();
        long before = runs();

        mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/predictions", bookmark.getId()), owner.getId())
                .header(ClientNetworks.CLIENT_ADDRESS_HEADER, "198.51.100.7")
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(Map.of(
                        "schemaVersionId", version.getId(), "modelId", forestModel.getId(),
                        "modelInput", Map.of("age", 52, "secretMarker", "s3nsitive")))))
                .andExpect(status().isOk());

        assertEquals(before + 1, runs());
        Map<String, Object> row = lastRun();
        assertEquals("USER", row.get("actor_kind"));
        assertEquals(owner.getId(), row.get("actor_user_id"));
        assertEquals("Owner", row.get("actor_label"));
        assertEquals(organization.getId(), row.get("organization_id"));
        assertEquals("Acme Health", row.get("organization_label"));
        assertEquals("SCHEMA_BOOKMARK", row.get("target_type"));
        assertEquals(bookmark.getId().toString(), row.get("target_id"));
        assertEquals("198.51.100.7", row.get("ip"));
        assertNotNull(row.get("request_id"));
        String metadata = row.get("metadata").toString();
        assertTrue(metadata.contains("\"status\": \"SUCCESS\""));
        assertFalse(metadata.contains("s3nsitive"));
    }

    @Test
    void aVisitorsRunIsOneEntryUnderNoAccount() throws Exception {
        long before = runs();

        mockMvc.perform(publicRun()).andExpect(status().isOk());

        assertEquals(before + 1, runs());
        Map<String, Object> row = lastRun();
        assertEquals("VISITOR", row.get("actor_kind"));
        assertEquals("Public visitor", row.get("actor_label"));
        assertNull(row.get("actor_user_id"));
        assertEquals(organization.getId(), row.get("organization_id"));
        assertEquals(bookmark.getId().toString(), row.get("target_id"));
        assertTrue(row.get("metadata").toString().contains("runId"));
        assertFalse(row.get("metadata").toString().contains("52"));
    }

    @Test
    void anAccountSignedInOnAPublicPageActsAsItself() throws Exception {
        mockMvc.perform(signedIn(publicRun(), owner.getId())).andExpect(status().isOk());

        Map<String, Object> row = lastRun();
        assertEquals("USER", row.get("actor_kind"));
        assertEquals(owner.getId(), row.get("actor_user_id"));
    }

    @Test
    void aRunTheRuntimeRefusedOnAPublicPageKeepsNoRunAndNoEntry() throws Exception {
        long before = runs();
        when(analyzer.post(eq("/predict"), any())).thenThrow(new AnalyzerServiceException(400, "No"));

        mockMvc.perform(publicRun()).andExpect(status().isUnprocessableContent());

        assertEquals(before, runs());
    }

    private MockHttpServletRequestBuilder publicRun() {
        return post("/api/public/bookmarks/{publicId}/predictions", bookmark.getPublicId())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":" + version.getVersion() + ",\"values\":{\"in0\":52}}");
    }

    private long runs() {
        return jdbc.queryForObject("SELECT count(*) FROM audit_event WHERE action = 'PREDICTION_RUN'", Long.class);
    }

    private Map<String, Object> lastRun() {
        return jdbc.queryForMap("SELECT * FROM audit_event WHERE action = 'PREDICTION_RUN' ORDER BY id DESC LIMIT 1");
    }
}
