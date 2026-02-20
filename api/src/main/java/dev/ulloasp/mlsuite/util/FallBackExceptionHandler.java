/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.util;

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

    @ExceptionHandler(Throwable.class) // absolutely everything
    public ResponseEntity<ErrorDto> handleFallback(Throwable ex, HttpServletRequest req) {
        var status = HttpStatus.INTERNAL_SERVER_ERROR;
        var dto = ErrorDto.of(status.value(), "Unexpected error", req.getRequestURI());
        return ResponseEntity.status(status).body(dto);
    }
}
