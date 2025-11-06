/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

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
    void constructor_ShouldCreateInstance() {
        // When
        FallBackExceptionHandler handler = new FallBackExceptionHandler();

        // Then
        assertNotNull(handler);
    }
}
