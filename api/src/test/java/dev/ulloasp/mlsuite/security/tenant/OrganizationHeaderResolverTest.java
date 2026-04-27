package dev.ulloasp.mlsuite.security.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

class OrganizationHeaderResolverTest {

    private final OrganizationHeaderResolver resolver = new OrganizationHeaderResolver();

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void requireOrganizationSlug_ThrowsWhenHeaderMissing() {
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(new MockHttpServletRequest()));

        assertThrows(MissingTenantHeaderException.class, resolver::requireOrganizationSlug);
    }

    @Test
    void resolveOrganizationSlug_ReturnsTrimmedHeader() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Organization-Slug", "  acme  ");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        assertEquals("acme", resolver.resolveOrganizationSlug());
    }

    @Test
    void resolveOrganizationSlug_ReturnsNullWhenBlank() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Organization-Slug", "   ");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        assertNull(resolver.resolveOrganizationSlug());
    }
}
