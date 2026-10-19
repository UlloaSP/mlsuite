package dev.ulloasp.mlsuite.audit;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.client.RestTemplate;

import dev.ulloasp.mlsuite.audit.adapter.in.web.AuditLogController;
import dev.ulloasp.mlsuite.audit.application.dto.AuditActorDto;
import dev.ulloasp.mlsuite.audit.application.dto.AuditEventDto;
import dev.ulloasp.mlsuite.audit.application.port.in.AuditLogUseCase;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.security.SecurityConfig;
import dev.ulloasp.mlsuite.security.auth.AuthenticatedUserPrincipal;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;

/** The audit log endpoint behind the real security filter chain. */
@WebMvcTest(controllers = AuditLogController.class, properties = {
        "spring.profiles.active=test",
        "logging.file.name=target/audit-log-http-test.log",
        "server.port=0",
        "cors.allow-origins=http://localhost:5173" })
@Import(SecurityConfig.class)
@MockitoBean(types = { RestTemplate.class, UserDetailsService.class })
class AuditLogHttpTest {

    private static final long MEMBER_ID = 7L;
    private static final long ORGANIZATION_ID = 41L;
    private static final String CATALOG = "/api/organizations/{organizationId}/audit-events/catalog";

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private AuditLogUseCase auditLog;

    @Test
    void anonymousVisitorsAreUnauthorized() throws Exception {
        mockMvc.perform(get(CATALOG, ORGANIZATION_ID)).andExpect(status().isUnauthorized());

        verifyNoInteractions(auditLog);
    }

    @Test
    void membersWithoutTheAuditPermissionAreForbidden() throws Exception {
        when(auditLog.list(anyLong(), anyLong(), any()))
                .thenThrow(new OrganizationAccessDeniedException(ORGANIZATION_ID));

        mockMvc.perform(signedIn(get(CATALOG, ORGANIZATION_ID))).andExpect(status().isForbidden());
    }

    @Test
    void aPageCarriesEachEntryAsRecorded() throws Exception {
        when(auditLog.list(MEMBER_ID, ORGANIZATION_ID, new CatalogRequest(1, 2, "north", "API_KEY_REVOKE", null)))
                .thenReturn(new PageDto<>(List.of(new AuditEventDto(90L,
                        OffsetDateTime.parse("2026-10-01T10:00:00Z"), new AuditActorDto(3L, "Ada Admin"),
                        "API_KEY_REVOKE", "API_CLIENT_KEY", "12", "North: ci (mls_ab12)")),
                        1, 2, 3, false));

        mockMvc.perform(signedIn(get(CATALOG, ORGANIZATION_ID)
                .param("page", "1").param("size", "2").param("search", "north").param("filter", "API_KEY_REVOKE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalItems").value(3))
                .andExpect(jsonPath("$.hasNext").value(false))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].length()").value(7))
                .andExpect(jsonPath("$.items[0].id").value(90))
                .andExpect(jsonPath("$.items[0].createdAt").value("2026-10-01T10:00:00Z"))
                .andExpect(jsonPath("$.items[0].actor.length()").value(2))
                .andExpect(jsonPath("$.items[0].actor.id").value(3))
                .andExpect(jsonPath("$.items[0].actor.name").value("Ada Admin"))
                .andExpect(jsonPath("$.items[0].action").value("API_KEY_REVOKE"))
                .andExpect(jsonPath("$.items[0].targetType").value("API_CLIENT_KEY"))
                .andExpect(jsonPath("$.items[0].targetId").value("12"))
                .andExpect(jsonPath("$.items[0].metadata").value("North: ci (mls_ab12)"));
    }

    @Test
    void theCatalogDefaultsToTheFirstPageOfEveryAction() throws Exception {
        when(auditLog.list(eq(MEMBER_ID), eq(ORGANIZATION_ID), eq(new CatalogRequest(null, null, null, null, null))))
                .thenReturn(new PageDto<>(List.of(), 0, 24, 0, false));

        mockMvc.perform(signedIn(get(CATALOG, ORGANIZATION_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(24))
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    /** A logged-in session, as the login endpoint leaves it for the filter chain to read. */
    private static MockHttpServletRequestBuilder signedIn(MockHttpServletRequestBuilder request) {
        var principal = new AuthenticatedUserPrincipal(MEMBER_ID, "member@example.com", "hash", SystemRole.USER, true);
        var authentication = UsernamePasswordAuthenticationToken.authenticated(
                principal, null, principal.getAuthorities());
        return request.sessionAttr(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                new SecurityContextImpl(authentication));
    }
}
