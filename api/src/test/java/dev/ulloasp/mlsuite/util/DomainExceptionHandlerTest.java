package dev.ulloasp.mlsuite.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
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
        when(request.getRequestURI()).thenReturn("/api/schema-reviews/missing");

        ResponseEntity<ErrorDto> response = handler.handleResponseStatus(
                new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied"),
                request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(403, response.getBody().status());
        assertEquals("Access denied", response.getBody().message());
        assertEquals("/api/schema-reviews/missing", response.getBody().path());
    }

    @Test
    void handleConflict_ReturnsConflictForConcurrentUpdates() {
        DomainExceptionHandler handler = new DomainExceptionHandler();
        when(request.getRequestURI()).thenReturn("/api/models/7");

        ResponseEntity<ErrorDto> response = handler.handleConflict(
                new OptimisticLockingFailureException("Model changed concurrently"),
                request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Model changed concurrently", response.getBody().message());
    }

    @Test
    void handleDataConflict_ReturnsSafeConflictForDatabaseConstraintRaces() {
        DomainExceptionHandler handler = new DomainExceptionHandler();
        when(request.getRequestURI()).thenReturn("/api/models");

        ResponseEntity<ErrorDto> response = handler.handleDataConflict(
                new DataIntegrityViolationException("sensitive SQL details"),
                request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Request conflicts with the current persisted state.", response.getBody().message());
    }
}
