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
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.domain.exception.RuntimeBusyException;

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
    void handleUnservedRequest_KeepsTheStatusTheFrameworkGaveTheCallersMistake() {
        DomainExceptionHandler handler = new DomainExceptionHandler();
        when(request.getRequestURI()).thenReturn("/api/models");

        assertEquals(HttpStatus.BAD_REQUEST, handler.handleUnservedRequest(
                new MissingServletRequestPartException("modelFile"), request).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, handler.handleUnservedRequest(
                new MissingServletRequestParameterException("name", "String"), request).getStatusCode());
        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, handler.handleUnservedRequest(
                new HttpMediaTypeNotSupportedException("text/plain"), request).getStatusCode());
    }

    @Test
    void handleUnreadableMultipart_IsTheCallersMistake() {
        DomainExceptionHandler handler = new DomainExceptionHandler();
        when(request.getRequestURI()).thenReturn("/api/models");

        ResponseEntity<ErrorDto> response = handler.handleUnreadableMultipart(
                new MultipartException("Current request is not a multipart request"), request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("This endpoint does not accept this request.", response.getBody().message());
    }

    @Test
    void handleUploadTooLarge_NamesTheBundleLimit() {
        DomainExceptionHandler handler = new DomainExceptionHandler();
        when(request.getRequestURI()).thenReturn("/api/models");

        ResponseEntity<ErrorDto> response = handler.handleUploadTooLarge(
                new MaxUploadSizeExceededException(512L * 1024 * 1024), request);

        assertEquals(HttpStatus.CONTENT_TOO_LARGE, response.getStatusCode());
        assertEquals("The file is too large: a model bundle can be at most 512 MB.", response.getBody().message());
    }

    @Test
    void handleRuntimeBusy_TellsTheClientWhenToRetry() {
        DomainExceptionHandler handler = new DomainExceptionHandler();
        when(request.getRequestURI()).thenReturn("/api/schema-bookmarks/1/predictions");

        ResponseEntity<ErrorDto> response = handler.handleResponseStatus(
                new RuntimeBusyException("Too many workspace runs are in progress. Try again in a moment.", 2), request);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("2", response.getHeaders().getFirst("Retry-After"));
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

    @Test
    void handleUnreadableBody_ReturnsBadRequestWithoutTheParsersWords() {
        DomainExceptionHandler handler = new DomainExceptionHandler();
        when(request.getRequestURI()).thenReturn("/api/schema-bookmarks/7");

        ResponseEntity<ErrorDto> response = handler.handleUnreadableBody(
                new HttpMessageNotReadableException("JSON parse error: Unexpected end-of-input in field name",
                        new MockHttpInputMessage(new byte[0])),
                request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().status());
        assertEquals("The request body is not valid JSON for this endpoint.", response.getBody().message());
    }
}
