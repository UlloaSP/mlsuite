package dev.ulloasp.mlsuite.organization;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.organization.adapter.in.web.OrganizationLogoController;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationLogoService;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationLogo;
import dev.ulloasp.mlsuite.security.SecurityConfig;
import dev.ulloasp.mlsuite.security.auth.AuthenticatedUserPrincipal;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;

/** The logo over HTTP: members replace and remove it behind the session, anyone reads it. */
@WebMvcTest(controllers = OrganizationLogoController.class, properties = {
        "spring.profiles.active=test",
        "logging.file.name=target/organization-logo-http-test.log",
        "server.port=0",
        "cors.allow-origins=http://localhost:5173" })
@Import(SecurityConfig.class)
@MockitoBean(types = { RestTemplate.class, UserDetailsService.class })
class OrganizationLogoHttpTest {

    private static final long USER_ID = 7L;
    private static final long ORG_ID = 41L;
    private static final OffsetDateTime REPLACED = OffsetDateTime.parse("2026-10-01T10:00:00Z");
    private static final byte[] PNG = { (byte) 0x89, 'P', 'N', 'G', 0, 1, 2, 3 };

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private OrganizationLogoService logos;

    @Test
    void aMemberReplacesTheLogoAndGetsTheOrganizationWithItsNewAddress() throws Exception {
        when(logos.replace(eq(USER_ID), eq(ORG_ID), any())).thenReturn(organization("/api/public/organizations/41/logo?v=1"));

        mockMvc.perform(signedIn(multipart(HttpMethod.PUT, "/api/organizations/{id}/logo", ORG_ID)
                .file(new MockMultipartFile("logo", "logo.png", "image/png", PNG))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ORG_ID))
                .andExpect(jsonPath("$.logoUrl").value("/api/public/organizations/41/logo?v=1"))
                .andExpect(jsonPath("$.avatarUrl").doesNotExist());
    }

    @Test
    void aRefusedPictureAnswersBadRequestWithTheReason() throws Exception {
        when(logos.replace(eq(USER_ID), eq(ORG_ID), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Upload a PNG or JPG image."));

        mockMvc.perform(signedIn(multipart(HttpMethod.PUT, "/api/organizations/{id}/logo", ORG_ID)
                .file(new MockMultipartFile("logo", "logo.svg", "image/svg+xml", "<svg/>".getBytes()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Upload a PNG or JPG image."));
    }

    @Test
    void replacingWithoutThePermissionIsForbidden() throws Exception {
        when(logos.replace(eq(USER_ID), eq(ORG_ID), any())).thenThrow(new OrganizationAccessDeniedException(ORG_ID));

        mockMvc.perform(signedIn(multipart(HttpMethod.PUT, "/api/organizations/{id}/logo", ORG_ID)
                .file(new MockMultipartFile("logo", "logo.png", "image/png", PNG))))
                .andExpect(status().isForbidden());
    }

    @Test
    void replacingAndRemovingNeedASession() throws Exception {
        mockMvc.perform(multipart(HttpMethod.PUT, "/api/organizations/{id}/logo", ORG_ID)
                .file(new MockMultipartFile("logo", "logo.png", "image/png", PNG)))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/organizations/{id}/logo", ORG_ID))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(logos);
    }

    @Test
    void aMemberRemovesTheLogo() throws Exception {
        when(logos.remove(USER_ID, ORG_ID)).thenReturn(organization(null));

        mockMvc.perform(signedIn(delete("/api/organizations/{id}/logo", ORG_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.logoUrl").isEmpty());
    }

    @Test
    void anyoneReadsTheLogoAndMayCacheItForGood() throws Exception {
        when(logos.read(ORG_ID)).thenReturn(Optional.of(new OrganizationLogo(ORG_ID, PNG, "image/png", REPLACED)));

        mockMvc.perform(get("/api/public/organizations/{id}/logo", ORG_ID).param("v", "1"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andExpect(header().string("Cache-Control", "max-age=31536000, public, immutable"))
                .andExpect(content().bytes(PNG));
    }

    @Test
    void anOrganizationWithoutALogoAnswersNotFound() throws Exception {
        when(logos.read(ORG_ID)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/public/organizations/{id}/logo", ORG_ID))
                .andExpect(status().isNotFound());
    }

    private static OrganizationDto organization(String logoUrl) {
        return new OrganizationDto(ORG_ID, "acme", "Acme", null, logoUrl, REPLACED, REPLACED);
    }

    private static AbstractMockHttpServletRequestBuilder<?> signedIn(AbstractMockHttpServletRequestBuilder<?> request) {
        var principal = new AuthenticatedUserPrincipal(USER_ID, "alice@example.com", "hash", SystemRole.USER, true);
        var authentication = UsernamePasswordAuthenticationToken.authenticated(
                principal, null, principal.getAuthorities());
        return request.sessionAttr(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                new SecurityContextImpl(authentication));
    }
}
