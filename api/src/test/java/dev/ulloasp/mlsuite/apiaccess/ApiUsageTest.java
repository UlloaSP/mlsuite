package dev.ulloasp.mlsuite.apiaccess;

import static org.hamcrest.Matchers.contains;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.apiaccess.application.service.ApiRequestRetention;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;

/**
 * The calls clients made, as their organization reads them (the request log and its usage) and
 * as the platform does (every organization's traffic, suspending a client, setting a limit).
 */
class ApiUsageTest extends ApiAccessFixture {

    @Autowired ApiRequestRetention retention;

    @Test
    void theRequestLogListsTheOrganizationsCallsNewestFirstByOutcome() throws Exception {
        logCalls(2, 422, OffsetDateTime.now().minusMinutes(3));
        logCalls(1, 503, OffsetDateTime.now().minusMinutes(2));
        String requestId = mockMvc.perform(predicting(secret, FEATURES))
                .andReturn().getResponse().getHeader("X-Request-Id");

        mockMvc.perform(member(get("/api/api-access/requests")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(4))
                .andExpect(jsonPath("$.items[0].requestId").value(requestId))
                .andExpect(jsonPath("$.items[0].status").value(200))
                .andExpect(jsonPath("$.items[0].predictionRunId").value(runsOf(single).getFirst().getId()))
                .andExpect(jsonPath("$.items[0].clientName").value("Lab2Pressure"));
        mockMvc.perform(member(get("/api/api-access/requests").param("filter", "rejected")))
                .andExpect(jsonPath("$.totalItems").value(2));
        mockMvc.perform(member(get("/api/api-access/requests").param("filter", "errors")))
                .andExpect(jsonPath("$.totalItems").value(3));
        mockMvc.perform(member(get("/api/api-access/requests").param("search", requestId.substring(0, 8))))
                .andExpect(jsonPath("$.totalItems").value(1));
        mockMvc.perform(member(get("/api/api-access/requests").param("clientId", "-1")))
                .andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(member(get("/api/api-access/requests").param("filter", "slow")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void usageCountsEveryHourOfTheDayAndTheMonthAgainstItsLimit() throws Exception {
        logCalls(3, 422, OffsetDateTime.now().minusHours(5));
        logCalls(1, 503, OffsetDateTime.now().minusHours(5));
        mockMvc.perform(predicting(secret, FEATURES));

        JsonNode day = read(member(get("/api/api-access/usage")));
        assertEquals("day", day.get("period").asText());
        assertEquals(5, day.get("calls").asLong());
        assertEquals(3, day.get("rejected").asLong());
        assertEquals(1, day.get("failed").asLong());
        assertEquals(1, day.get("activeClients").asLong());
        assertEquals(24, day.get("series").size());
        JsonNode last = day.get("series").get(23);
        assertEquals(OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.HOURS).toInstant(),
                OffsetDateTime.parse(last.get("start").asText()).toInstant());
        assertEquals(1, last.get("succeeded").asLong());
        assertEquals(3, day.at("/series/18/rejected").asLong() + day.at("/series/17/rejected").asLong()
                + day.at("/series/19/rejected").asLong());
        assertEquals("Lab2Pressure", day.at("/topClients/0/clientName").asText());
        assertEquals(4, day.get("recentFailures").size());
        assertEquals(1, day.at("/month/calls").asLong());
        assertEquals(10000, day.at("/month/limit").asInt());
        assertEquals(90, day.get("retentionDays").asInt());

        assertEquals(7, read(member(get("/api/api-access/usage").param("period", "week"))).get("series").size());
        assertEquals(30, read(member(get("/api/api-access/usage").param("period", "month"))).get("series").size());
        JsonNode client = read(member(get("/api/api-access/usage").param("clientId", clientId.toString())));
        assertEquals(0, client.get("topClients").size());
        mockMvc.perform(member(get("/api/api-access/usage").param("period", "year"))).andExpect(status().isBadRequest());
        mockMvc.perform(member(get("/api/api-access/usage").param("clientId", "-1"))).andExpect(status().isNotFound());
    }

    @Test
    void onlySuperadminsReadThePlatformsTraffic() throws Exception {
        mockMvc.perform(member(get("/api/admin/api-traffic/usage"))).andExpect(status().isForbidden());
        mockMvc.perform(member(get("/api/admin/api-traffic/clients"))).andExpect(status().isForbidden());
        mockMvc.perform(predicting(secret, FEATURES));

        JsonNode usage = read(superadmin(get("/api/admin/api-traffic/usage")));
        assertTrue(usage.get("month").isNull());
        assertTrue(usage.get("activeOrganizations").asLong() >= 1);
        mockMvc.perform(superadmin(get("/api/admin/api-traffic/clients").param("search", organization.getName())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.id == " + clientId + ")].organizationName")
                        .value(contains(organization.getName())))
                .andExpect(jsonPath("$.items[?(@.id == " + clientId + ")].weekCalls")
                        .value(contains(1)));
    }

    @Test
    void thePlatformSuspendsAClientWithAReasonItsOrganizationReadsAndReinstatesIt() throws Exception {
        mockMvc.perform(superadmin(json(post("/api/admin/api-traffic/clients/{id}/suspend", clientId), "{}")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(superadmin(json(post("/api/admin/api-traffic/clients/{id}/suspend", clientId),
                "{\"reason\":\"Scraping every model\"}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENDED"));

        mockMvc.perform(predicting(secret, FEATURES)).andExpect(status().isForbidden());
        mockMvc.perform(member(get("/api/api-clients/{id}", clientId)))
                .andExpect(jsonPath("$.client.suspensionReason").value("Scraping every model"));

        mockMvc.perform(superadmin(post("/api/admin/api-traffic/clients/{id}/reinstate", clientId)))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
        mockMvc.perform(predicting(secret, FEATURES)).andExpect(status().isOk());
        assertEquals(1, auditEvents("API_CLIENT_SUSPEND"));
        assertEquals(1, auditEvents("API_CLIENT_REINSTATE"));
    }

    @Test
    void thePlatformSetsAnOrganizationsMonthlyLimitOrReturnsItToTheDefault() throws Exception {
        String name = "Limited " + organization.getId();
        inTransaction(() -> entityManager.find(Organization.class, organization.getId()).setName(name));
        String limitPath = "/api/admin/api-traffic/organizations/" + organization.getId() + "/call-limit";
        mockMvc.perform(superadmin(json(put(limitPath), "{\"monthlyCalls\":-1}"))).andExpect(status().isBadRequest());
        mockMvc.perform(superadmin(json(put(limitPath), "{\"monthlyCalls\":0}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monthlyLimit").value(0))
                .andExpect(jsonPath("$.customLimit").value(true));
        mockMvc.perform(predicting(secret, FEATURES)).andExpect(status().isTooManyRequests());

        mockMvc.perform(superadmin(json(put(limitPath), "{\"monthlyCalls\":null}")))
                .andExpect(jsonPath("$.monthlyLimit").value(10000))
                .andExpect(jsonPath("$.customLimit").value(false));
        mockMvc.perform(predicting(secret, FEATURES)).andExpect(status().isOk());
        mockMvc.perform(superadmin(get("/api/admin/api-traffic/organizations").param("search", name)))
                .andExpect(jsonPath("$.items[?(@.organizationId == " + organization.getId() + ")].monthCalls")
                        .value(contains(1)));
        assertEquals(2, auditEvents("API_CALL_LIMIT_SET"));
    }

    @Test
    void callsOlderThanTheRetentionPeriodAreForgottenAndTheirRunsStay() throws Exception {
        mockMvc.perform(predicting(secret, FEATURES));
        logCalls(2, 200, OffsetDateTime.now().minusDays(91));

        retention.prune();

        assertEquals(1, calls().size());
        assertEquals(1, runsOf(single).size());
    }

    private JsonNode read(MockHttpServletRequestBuilder request) throws Exception {
        return objectMapper.readTree(mockMvc.perform(request).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
    }

    private MockHttpServletRequestBuilder superadmin(MockHttpServletRequestBuilder request) {
        return signedIn(request, owner.getId(), SystemRole.SUPERADMIN);
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String body) {
        return request.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private long auditEvents(String action) {
        return entityManager.createQuery(
                "select count(e) from AuditEvent e where e.organization.id = :id and e.action = :action", Long.class)
                .setParameter("id", organization.getId()).setParameter("action", action).getSingleResult();
    }
}
