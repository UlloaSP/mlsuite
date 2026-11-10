/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.util;

import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.beans.TypeMismatchException;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
import java.util.Arrays;
import java.time.Instant;
import java.util.stream.Collectors;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.HttpMediaTypeException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.domain.exception.ModelAlreadyExistsException;
import dev.ulloasp.mlsuite.model.domain.exception.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.domain.exception.ModelNotFromUserException;
import dev.ulloasp.mlsuite.invitation.domain.exception.InvitationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.exception.HandleTakenException;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.exception.PersonalAccountException;
import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentException;
import dev.ulloasp.mlsuite.notification.domain.exception.NotificationNotFoundException;
import dev.ulloasp.mlsuite.plugin.domain.exception.PluginNotFoundException;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunLimitDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaMappingErrorDto;
import dev.ulloasp.mlsuite.schema.domain.exception.PublicRunLimitException;
import dev.ulloasp.mlsuite.schema.domain.exception.SchemaMappingException;
import dev.ulloasp.mlsuite.security.auth.AuthAttemptLimitException;
import dev.ulloasp.mlsuite.user.domain.exception.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import jakarta.servlet.http.HttpServletRequest;
import tools.jackson.databind.exc.ValueInstantiationException;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice
public class DomainExceptionHandler {

    private static final String UNSERVED_REQUEST = "This endpoint does not accept this request.";

    // ---- 404 NOT FOUND ----

    @ExceptionHandler({
            ModelDoesNotExistsException.class,
            PluginNotFoundException.class,
            UserDoesNotExistException.class,
            OrganizationNotFoundException.class,
            InvitationNotFoundException.class,
            NotificationNotFoundException.class
    })
    public ResponseEntity<ErrorDto> handleNotFound(RuntimeException ex, HttpServletRequest req) {
        return respond(HttpStatus.NOT_FOUND, ex, req);
    }

    // ---- 409 CONFLICT ----

    @ExceptionHandler({
            ModelAlreadyExistsException.class,
            UserAlreadyExistsException.class,
            HandleTakenException.class,
            PersonalAccountException.class,
            OptimisticLockingFailureException.class
    })
    public ResponseEntity<ErrorDto> handleConflict(RuntimeException ex, HttpServletRequest req) {
        return respond(HttpStatus.CONFLICT, ex, req);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorDto> handleDataConflict(
            DataIntegrityViolationException ex,
            HttpServletRequest req) {
        ConstraintConflicts.Conflict conflict = ConstraintConflicts.of(ex).orElseGet(() -> new ConstraintConflicts.Conflict(
                HttpStatus.CONFLICT, "Request conflicts with the current persisted state."));
        return ResponseEntity.status(conflict.status())
                .body(ErrorDto.of(conflict.status().value(), conflict.message(), req.getRequestURI()));
    }

    // ---- 403 FORBIDDEN ----

    // AccessDeniedException is what method security (@PreAuthorize) throws for a signed-in user.
    @ExceptionHandler({
            ModelNotFromUserException.class,
            OrganizationAccessDeniedException.class,
            AccessDeniedException.class
    })
    public ResponseEntity<ErrorDto> handleForbidden(RuntimeException ex, HttpServletRequest req) {
        return respond(HttpStatus.FORBIDDEN, ex, req);
    }

    /**
     * A wrong password and a disabled account are answered alike: the account's state is checked
     * before its password, so telling them apart would describe an account to anyone who names it.
     */
    @ExceptionHandler({ BadCredentialsException.class, DisabledException.class })
    public ResponseEntity<ErrorDto> handleBadCredentials(RuntimeException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ErrorDto.of(HttpStatus.UNAUTHORIZED.value(),
                "The email or password is incorrect.", req.getRequestURI()));
    }

    // ---- 429 TOO MANY REQUESTS ----

    /** Retry-After is whole seconds, rounded up so a client that waits them is never early. */
    @ExceptionHandler(PublicRunLimitException.class)
    public ResponseEntity<PublicRunLimitDto> handlePublicRunLimit(PublicRunLimitException ex, HttpServletRequest req) {
        long retryAfterSeconds = ex.getRetryAfter().plusMillis(999).toSeconds();
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds))
                .body(PublicRunLimitDto.of(ex, HttpStatus.TOO_MANY_REQUESTS.value(), req.getRequestURI()));
    }

    @ExceptionHandler(AuthAttemptLimitException.class)
    public ResponseEntity<ErrorDto> handleAuthAttemptLimit(AuthAttemptLimitException ex, HttpServletRequest req) {
        long retryAfterSeconds = ex.getRetryAfter().plusMillis(999).toSeconds();
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds))
                .body(ErrorDto.of(HttpStatus.TOO_MANY_REQUESTS.value(), ex.getMessage(), req.getRequestURI()));
    }

    // ---- 413 CONTENT TOO LARGE ----

    /** An upload above the multipart limit (a model bundle above 512 MB) is refused before it is read. */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorDto> handleUploadTooLarge(MaxUploadSizeExceededException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.CONTENT_TOO_LARGE)
                .body(ErrorDto.of(HttpStatus.CONTENT_TOO_LARGE.value(),
                        "The file is too large: a model bundle can be at most 512 MB.", req.getRequestURI()));
    }

    // ---- 400 BAD REQUEST ----

    /** A schema whose mappings name nothing its models have, with each such mapping located. */
    @ExceptionHandler(SchemaMappingException.class)
    public ResponseEntity<SchemaMappingErrorDto> handleSchemaMapping(SchemaMappingException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(SchemaMappingErrorDto.of(ex, HttpStatus.BAD_REQUEST.value(), req.getRequestURI()));
    }

    /**
     * Also the cause of a query object that refused its values while it was bound, e.g. an unknown
     * catalog sort: typed as the cause, so the answer carries its words, not the binder's.
     */
    @ExceptionHandler({
            IllegalArgumentException.class
    })
    public ResponseEntity<ErrorDto> handleBadRequest(IllegalArgumentException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorDto.of(HttpStatus.BAD_REQUEST.value(), readable(ex.getMessage()), req.getRequestURI()));
    }

    /** A query or path value of the wrong type: which parameter, never the Java type it was read into. */
    @ExceptionHandler(TypeMismatchException.class)
    public ResponseEntity<ErrorDto> handleTypeMismatch(TypeMismatchException ex, HttpServletRequest req) {
        String name = ex instanceof MethodArgumentTypeMismatchException argument ? argument.getName() : ex.getPropertyName();
        Class<?> type = ex.getRequiredType();
        String expected = type != null && type.isEnum()
                ? " Expected one of: " + String.join(", ", Arrays.stream(type.getEnumConstants()).map(String::valueOf).toList()) + "."
                : "";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorDto.of(HttpStatus.BAD_REQUEST.value(),
                "Invalid value '" + ex.getValue() + "' for '" + name + "'." + expected, req.getRequestURI()));
    }

    /** "No enum constant a.b.Type.VALUE", from reading a name into an enum, said without the Java type. */
    private static String readable(String message) {
        if (message == null) return "Invalid request.";
        Matcher constant = ENUM_CONSTANT.matcher(message);
        return constant.find() ? "Unknown value '" + constant.group(1) + "'." : message;
    }

    private static final Pattern ENUM_CONSTANT = Pattern.compile("No enum constant [\\w.$]+\\.(\\w+)$");

    /**
     * A body the endpoint cannot read is the caller's mistake; the parser's own words stay out of the
     * answer. A body read into a request that refused its values says which, in the request's words.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorDto> handleUnreadableBody(HttpMessageNotReadableException ex, HttpServletRequest req) {
        String message = ex.getCause() instanceof ValueInstantiationException refused
                && refused.getCause() instanceof IllegalArgumentException invalid
                ? readable(invalid.getMessage())
                : "The request body is not valid JSON for this endpoint.";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorDto.of(HttpStatus.BAD_REQUEST.value(), message, req.getRequestURI()));
    }

    /** A request no endpoint can take (route, method, media type, a missing part) is not a server failure. */
    @ExceptionHandler({
            NoResourceFoundException.class,
            HttpRequestMethodNotSupportedException.class,
            HttpMediaTypeException.class,
            ServletRequestBindingException.class
    })
    public ResponseEntity<ErrorDto> handleUnservedRequest(ErrorResponse ex, HttpServletRequest req) {
        HttpStatusCode status = ex.getStatusCode();
        return ResponseEntity.status(status)
                .body(ErrorDto.of(status.value(), UNSERVED_REQUEST, req.getRequestURI()));
    }

    /** Multipart parsing failed, or the request is not multipart at all; a size limit has its own handler. */
    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<ErrorDto> handleUnreadableMultipart(MultipartException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorDto.of(HttpStatus.BAD_REQUEST.value(), UNSERVED_REQUEST, req.getRequestURI()));
    }

    // ---- Analyzer (dynamic status) ----

    @ExceptionHandler(AnalyzerServiceException.class)
    public ResponseEntity<ErrorDto> handleAnalyzer(AnalyzerServiceException ex, HttpServletRequest req) {
        HttpStatus status = ex.getStatus() > 0 ? HttpStatus.valueOf(ex.getStatus()) : HttpStatus.BAD_GATEWAY;
        String message = (ex.getDetail() == null || ex.getDetail().isBlank()) ? "Analyzer Error" : ex.getDetail();
        return ResponseEntity.status(status)
                .body(new ErrorDto(Instant.now(), status.value(), message, req.getRequestURI()));
    }

    @ExceptionHandler(OpsAgentException.class)
    public ResponseEntity<ErrorDto> handleOpsAgent(OpsAgentException ex, HttpServletRequest req) {
        HttpStatus status = ex.getStatus() > 0 ? HttpStatus.valueOf(ex.getStatus()) : HttpStatus.BAD_GATEWAY;
        return ResponseEntity.status(status)
                .body(new ErrorDto(Instant.now(), status.value(), ex.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorDto> handleResponseStatus(ResponseStatusException ex, HttpServletRequest req) {
        String message = ex.getReason() == null || ex.getReason().isBlank()
                ? ex.getStatusCode().toString()
                : ex.getReason();
        return ResponseEntity.status(ex.getStatusCode())
                .headers(ex.getHeaders())
                .body(ErrorDto.of(ex.getStatusCode().value(), message, req.getRequestURI()));
    }

    // ---- Validation (@Valid) ----

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorDto> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorDto.of(HttpStatus.BAD_REQUEST.value(), message, req.getRequestURI()));
    }

    // ---- helper ----

    private ResponseEntity<ErrorDto> respond(HttpStatus status, RuntimeException ex, HttpServletRequest req) {
        return ResponseEntity.status(status)
                .body(ErrorDto.of(status.value(), ex.getMessage(), req.getRequestURI()));
    }
}
