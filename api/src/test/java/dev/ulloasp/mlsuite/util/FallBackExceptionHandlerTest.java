/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.List;

import org.apache.catalina.connector.ClientAbortException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;

import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
class FallBackExceptionHandlerTest {

    @Mock
    private HttpServletRequest mockRequest;

    @InjectMocks
    private FallBackExceptionHandler fallBackExceptionHandler;

    @Test
    void handleFallback_RuntimeException() {
        // Given
        when(mockRequest.getRequestURI()).thenReturn("/api/test");
        RuntimeException exception = new RuntimeException("Test runtime exception");

        // When
        ResponseEntity<ErrorDto> response = fallBackExceptionHandler.handleFallback(exception, mockRequest);

        // Then
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());

        ErrorDto errorDto = response.getBody();
        assertNotNull(errorDto);
        assertEquals(500, errorDto.status());
        assertEquals("Unexpected error", errorDto.message());
        assertEquals("/api/test", errorDto.path());
        assertNotNull(errorDto.timestamp());
    }

    @Test
    void handleFallback_NullPointerException() {
        // Given
        when(mockRequest.getRequestURI()).thenReturn("/api/test");
        NullPointerException exception = new NullPointerException("Null pointer test");

        // When
        ResponseEntity<ErrorDto> response = fallBackExceptionHandler.handleFallback(exception, mockRequest);

        ErrorDto errorDto = response.getBody();
        assertNotNull(errorDto);
        assertEquals(500, errorDto.status());
        assertEquals("Unexpected error", errorDto.message());
        assertEquals("/api/test", errorDto.path());
        assertNotNull(errorDto.timestamp());
    }

    @Test
    void handleFallback_IllegalArgumentException() {
        // Given
        when(mockRequest.getRequestURI()).thenReturn("/api/test");
        IllegalArgumentException exception = new IllegalArgumentException("Invalid argument");

        // When
        ResponseEntity<ErrorDto> response = fallBackExceptionHandler.handleFallback(exception, mockRequest);
        assertNotNull(response.getBody());

        ErrorDto errorDto = response.getBody();
        assertNotNull(errorDto);
        assertEquals(500, errorDto.status());
        assertEquals("Unexpected error", errorDto.message());
        assertEquals("/api/test", errorDto.path());
        assertNotNull(errorDto.timestamp());
    }

    @Test
    void handleFallback_Error() {
        // Given
        when(mockRequest.getRequestURI()).thenReturn("/api/test");
        Error error = new Error("System error");

        // When
        ResponseEntity<ErrorDto> response = fallBackExceptionHandler.handleFallback(error, mockRequest);
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());

        ErrorDto errorDto = response.getBody();
        assertNotNull(errorDto);
        assertEquals(500, errorDto.status());
        assertEquals("Unexpected error", errorDto.message());
        assertEquals("/api/test", errorDto.path());
        assertNotNull(errorDto.timestamp());
    }

    @Test
    void handleFallback_ExceptionWithNullMessage() {
        // Given
        when(mockRequest.getRequestURI()).thenReturn("/api/test");
        Exception exception = new Exception((String) null);

        // When
        ResponseEntity<ErrorDto> response = fallBackExceptionHandler.handleFallback(exception, mockRequest);
        // Then
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());

        ErrorDto errorDto = response.getBody();
        assertNotNull(errorDto);
        assertEquals(500, errorDto.status());
        assertEquals("Unexpected error", errorDto.message());
        assertEquals("/api/test", errorDto.path());
        assertNotNull(errorDto.timestamp());
    }

    @Test
    void handleFallback_DifferentRequestPaths() {
        // Given
        String[] paths = { "/api/model", "/api/user", "/api/prediction", "/api/signature" };
        Exception exception = new Exception("Test exception");

        for (String path : paths) {
            when(mockRequest.getRequestURI()).thenReturn(path);

            // When
            ResponseEntity<ErrorDto> response = fallBackExceptionHandler.handleFallback(exception, mockRequest);

            // Then
            assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
            assertNotNull(response.getBody());

            ErrorDto errorDto = response.getBody();
            assertNotNull(errorDto);
            assertEquals(path, errorDto.path());
        }
    }

    @Test
    void aClientThatWentAwayIsNeitherAnErrorNorWrittenTo() {
        when(mockRequest.getMethod()).thenReturn("POST");
        when(mockRequest.getRequestURI()).thenReturn("/api/prediction-runs/catalog");
        Logger logger = (Logger) LoggerFactory.getLogger(FallBackExceptionHandler.class);
        ListAppender<ILoggingEvent> logged = new ListAppender<>();
        logged.start();
        logger.addAppender(logged);
        try {
            for (Throwable gone : List.of(
                    new ClientAbortException(new IOException("Broken pipe")),
                    new AsyncRequestNotUsableException("ServletOutputStream failed to write: Broken pipe"),
                    new IOException("Broken pipe"))) {
                assertNull(fallBackExceptionHandler.handleFallback(gone, mockRequest), gone.toString());
            }
            fallBackExceptionHandler.handleFallback(new IllegalStateException("boom"), mockRequest);
        } finally {
            logger.detachAppender(logged);
        }

        // Only the real failure is an error, logged with its stack trace.
        List<ILoggingEvent> errors = logged.list.stream().filter(event -> event.getLevel() == Level.ERROR).toList();
        assertEquals(1, errors.size());
        assertEquals("boom", errors.get(0).getThrowableProxy().getMessage());
    }

    @Test
    void constructor_ShouldCreateInstance() {
        // When
        FallBackExceptionHandler handler = new FallBackExceptionHandler();

        // Then
        assertNotNull(handler);
    }
}

