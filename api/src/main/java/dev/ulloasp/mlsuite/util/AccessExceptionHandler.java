package dev.ulloasp.mlsuite.util;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import dev.ulloasp.mlsuite.security.tenant.MissingTenantHeaderException;
import dev.ulloasp.mlsuite.security.tenant.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.security.tenant.PermissionDeniedException;
import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class AccessExceptionHandler {

    @ExceptionHandler(MissingTenantHeaderException.class)
    public ResponseEntity<ErrorDto> handleMissingTenant(MissingTenantHeaderException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorDto.of(HttpStatus.BAD_REQUEST.value(), ex.getMessage(), request.getRequestURI()));
    }

    @ExceptionHandler({ OrganizationAccessDeniedException.class, PermissionDeniedException.class })
    public ResponseEntity<ErrorDto> handleForbidden(RuntimeException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorDto.of(HttpStatus.FORBIDDEN.value(), ex.getMessage(), request.getRequestURI()));
    }
}
