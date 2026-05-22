package dev.ulloasp.mlsuite.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
class DomainExceptionHandlerTest {

    @Mock
    private HttpServletRequest request;

    @Test
    void handleResponseStatus_PreservesStatusAndReason() {
        DomainExceptionHandler handler = new DomainExceptionHandler();
        when(request.getRequestURI()).thenReturn("/api/review-links/token/bad/context");

        ResponseEntity<ErrorDto> response = handler.handleResponseStatus(
                new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied"),
                request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(403, response.getBody().status());
        assertEquals("Access denied", response.getBody().message());
        assertEquals("/api/review-links/token/bad/context", response.getBody().path());
    }
}
