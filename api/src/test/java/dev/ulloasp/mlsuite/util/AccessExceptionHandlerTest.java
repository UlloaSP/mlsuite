package dev.ulloasp.mlsuite.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import dev.ulloasp.mlsuite.security.tenant.MissingTenantHeaderException;
import dev.ulloasp.mlsuite.security.tenant.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.security.tenant.PermissionDeniedException;
import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
class AccessExceptionHandlerTest {

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private AccessExceptionHandler handler;

    @Test
    void handleMissingTenant_ReturnsBadRequest() {
        when(request.getRequestURI()).thenReturn("/api/user/profile");

        var response = handler.handleMissingTenant(new MissingTenantHeaderException("X-Organization-Slug"), request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Missing required tenant header 'X-Organization-Slug'", response.getBody().message());
    }

    @Test
    void handleForbidden_ReturnsForbiddenForOrganizationAccess() {
        when(request.getRequestURI()).thenReturn("/api/model/all");

        var response = handler.handleForbidden(new OrganizationAccessDeniedException("acme"), request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("User does not have access to organization 'acme'", response.getBody().message());
    }

    @Test
    void handleForbidden_ReturnsForbiddenForPermissionError() {
        when(request.getRequestURI()).thenReturn("/api/plugins/upload");

        var response = handler.handleForbidden(new PermissionDeniedException("plugins:manage"), request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("Missing required permission 'plugins:manage'", response.getBody().message());
    }
}
