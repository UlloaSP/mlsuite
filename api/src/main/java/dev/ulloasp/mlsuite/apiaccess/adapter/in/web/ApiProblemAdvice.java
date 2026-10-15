package dev.ulloasp.mlsuite.apiaccess.adapter.in.web;

import java.net.URI;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import dev.ulloasp.mlsuite.apiaccess.domain.exception.ApiErrorCode;
import dev.ulloasp.mlsuite.apiaccess.domain.exception.ApiProblem;
import jakarta.servlet.http.HttpServletRequest;

/**
 * The client API answers every refusal as an RFC 9457 problem ({@code application/problem+json})
 * with a stable {@code code}, and, once the call was logged, its {@code requestId}, also sent as
 * the X-Request-Id header. It covers the client API alone; the app's own endpoints keep their
 * error body.
 */
@RestControllerAdvice(assignableTypes = ApiPredictionController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ApiProblemAdvice {

    @ExceptionHandler(ApiProblem.class)
    public ResponseEntity<ProblemDetail> handleProblem(ApiProblem problem, HttpServletRequest request) {
        ResponseEntity.BodyBuilder response = ResponseEntity.status(problem.code().status());
        if (problem.retryAfterSeconds() != null) {
            response.header(HttpHeaders.RETRY_AFTER, problem.retryAfterSeconds().toString());
        }
        if (problem.requestId() != null) {
            response.header(ApiPredictionController.REQUEST_ID_HEADER, problem.requestId().toString());
        }
        ProblemDetail body = body(problem.code(), problem.getMessage(), request);
        if (problem.requestId() != null) body.setProperty("requestId", problem.requestId().toString());
        return response.body(body);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> handleUnreadable(HttpMessageNotReadableException ignored,
            HttpServletRequest request) {
        return invalidBody("The body is not valid JSON.", request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleInvalid(MethodArgumentNotValidException ignored,
            HttpServletRequest request) {
        return invalidBody("The body must be an object with a \"features\" object.", request);
    }

    private static ResponseEntity<ProblemDetail> invalidBody(String detail, HttpServletRequest request) {
        return ResponseEntity.status(ApiErrorCode.INVALID_BODY.status())
                .body(body(ApiErrorCode.INVALID_BODY, detail, request));
    }

    private static ProblemDetail body(ApiErrorCode code, String detail, HttpServletRequest request) {
        ProblemDetail body = ProblemDetail.forStatusAndDetail(code.status(), detail);
        body.setTitle(code.title());
        body.setInstance(URI.create(request.getRequestURI()));
        body.setProperty("code", code.code());
        return body;
    }
}
