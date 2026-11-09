package dev.ulloasp.mlsuite.util;

import static dev.ulloasp.mlsuite.util.CatalogParameterFixture.Caller.OWNER;
import static dev.ulloasp.mlsuite.util.CatalogParameterFixture.Caller.VISITOR;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Every catalog a member reads refuses a query value it does not offer, instead of answering some
 * default: 400, naming the parameter, the value and what the catalog accepts.
 */
class CatalogParameterValidationHttpTest extends CatalogParameterFixture {

    @Test
    void organizationCatalogsRefuseUnknownValues() throws Exception {
        String org = "/api/organizations/" + organization.getId();
        refusesUnknownValues(OWNER, org + "/invitations/catalog", "filter");
        refusesUnknownValues(OWNER, org + "/invitation-candidates/catalog", "filter");
        refusesUnknownValues(OWNER, org + "/members/catalog", "filter");
        refusesUnknownValues(OWNER, org + "/members/roles/catalog", "filter");
        refusesUnknownValues(OWNER, org + "/owner-candidates/catalog", "filter");
        refusesUnknownValues(OWNER, org + "/members/" + member.getId() + "/roles/catalog", "filter");
        refusesUnknownValues(OWNER, org + "/roles/catalog", "filter");
        refusesUnknownValues(OWNER, org + "/role-templates/catalog", "filter");
        refusesUnknownValues(OWNER, org + "/permissions/catalog", "filter");
        refusesUnknownValues(OWNER, org + "/audit-events/catalog", "filter");
        refusesUnknownValues(OWNER, "/api/workspace/context/organizations/catalog", "filter");
        refusesUnknownValues(OWNER, "/api/notifications/catalog", "filter");
        refusesUnknownValues(OWNER, "/api/invitations/pending/catalog", "filter");
        refusesUnknownValues(OWNER, "/api/api-clients", "filter");
        refusesUnknownValues(OWNER, "/api/api-access/requests", "filter");
    }

    @Test
    void schemaAndReviewCatalogsRefuseUnknownValues() throws Exception {
        String schemaPath = "/api/schemas/" + schema.getId();
        refusesUnknownValues(OWNER, schemaPath + "/versions/catalog", "filter");
        refusesUnknownValues(OWNER, schemaPath + "/drafts/catalog", "filter");
        refusesUnknownValues(OWNER, schemaPath + "/bookmarks/catalog", "filter");
        refusesUnknownValues(OWNER, "/api/schema-bookmarks/catalog", "filter");
        refusesUnknownValues(OWNER, "/api/schema-bookmarks/" + bookmark.getId() + "/examples/catalog", "filter");
        refusesUnknownValues(OWNER, "/api/schema-reviews/managed/catalog", "filter");
        refusesUnknownValues(OWNER, "/api/schema-reviews/inbox/runs/catalog", "filter");
        refusesUnknownValues(OWNER, "/api/schema-reviews/inferences/" + runId + "/assignments/catalog", "filter");
        refusesUnknownValues(OWNER, "/api/models", "status");
        refusesUnknownValues(OWNER, "/api/schemas", "status");
        refusesUnknownValues(OWNER, "/api/plugins", "type");
    }

    @Test
    void aReviewsRunsAreRefusedAnUnknownFilterBeforeTheReviewIsLookedUp() throws Exception {
        refused(as(OWNER, get("/api/schema-reviews/inbox/no-such-review/runs/catalog").param("filter", "bogus")),
                "Unknown filter 'bogus'; expected one of: all, active, PENDING, IN_PROGRESS, COMPLETED");
        refused(as(OWNER, get("/api/schema-reviews/inbox/no-such-review/runs/catalog").param("sort", "bogus")),
                "Unknown sort 'bogus'; expected one of: updated");
    }

    @Test
    void publicCatalogsRefuseUnknownValues() throws Exception {
        String publicId = bookmark.getPublicId();
        refusesUnknownValues(VISITOR, "/api/public/bookmarks", null);
        refusesUnknownValues(VISITOR, "/api/public/bookmarks/" + publicId + "/examples/catalog", "filter");
        refusesUnknownValues(VISITOR, "/api/public/bookmarks/" + publicId + "/runs/catalog", "filter");
    }

    @Test
    void theValuesTheAppSendsAreServed() throws Exception {
        String org = "/api/organizations/" + organization.getId();
        ok(get(org + "/members/catalog").param("filter", "ALL"));
        ok(get(org + "/members/catalog").param("filter", memberRole.getId().toString()));
        ok(get(org + "/members/roles/catalog").param("filter", memberRole.getId().toString()).param("size", "1"));
        ok(get(org + "/invitations/catalog").param("filter", "PENDING"));
        ok(get(org + "/roles/catalog").param("filter", "invitable"));
        ok(get("/api/schemas/" + schema.getId() + "/versions/catalog").param("sort", "updated"));
        ok(get("/api/schemas/" + schema.getId() + "/drafts/catalog").param("filter", "conflict"));
        ok(get("/api/schema-bookmarks/catalog").param("filter", "behind").param("sort", "recent"));
        ok(get("/api/schema-reviews/inbox/runs/catalog").param("filter", "IN_PROGRESS"));
        ok(get("/api/schema-reviews/inferences/" + runId + "/assignments/catalog")
                .param("filter", "COMPLETED").param("sort", "submitted"));
        ok(get("/api/workspace/context/organizations/catalog").param("filter", "team"));
        ok(get("/api/notifications/catalog").param("filter", "unread"));
        ok(get("/api/models").param("status", "archived").param("sort", "algorithm"));
        ok(get("/api/plugins").param("type", "report").param("sort", "name"));
    }

    @Test
    void aMemberRoleFilterMustNameARoleOfTheOrganization() throws Exception {
        String members = "/api/organizations/" + organization.getId() + "/members/catalog";
        refused(as(OWNER, get(members).param("filter", "not-a-role")),
                "Unknown filter 'not-a-role'; expected one of: all, <role id>");
        refused(as(OWNER, get(members).param("filter", "999999999")),
                "Unknown filter '999999999'; expected one of: all, <role id>");
    }

    @Test
    void anAuditLogRefusesAPeriodThatEndsBeforeItStarts() throws Exception {
        refused(as(OWNER, get("/api/organizations/" + organization.getId() + "/audit-events/catalog")
                .param("from", "2026-11-09T00:00:00Z").param("to", "2026-11-08T00:00:00Z")),
                "Invalid range: from '2026-11-09T00:00Z' is after to '2026-11-08T00:00Z'");
    }

    private void ok(MockHttpServletRequestBuilder request) throws Exception {
        mockMvc.perform(as(OWNER, request)).andExpect(status().isOk());
    }
}
