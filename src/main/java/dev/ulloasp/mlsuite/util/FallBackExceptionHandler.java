package dev.ulloasp.mlsuite.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.servlet.http.HttpServletRequest;

@Order(Ordered.LOWEST_PRECEDENCE) // runs after your specific handlers
@RestControllerAdvice
public class FallBackExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(FallBackExceptionHandler.class);

    @ExceptionHandler(Throwable.class) // absolutely everything
    public ResponseEntity<ErrorDto> handleFallback(Throwable ex, HttpServletRequest req) {
        // 1) Log full detail for ops
        log.error("Unhandled exception at {}: {}", req.getRequestURI(), ex.getMessage(), ex);

        // 2) Return generic, non-leaky payload
        var status = HttpStatus.INTERNAL_SERVER_ERROR;
        var dto = ErrorDto.of(status.value(), "Unexpected error", req.getRequestURI());
        return ResponseEntity.status(status).body(dto);
    }
}
