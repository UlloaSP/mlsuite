package dev.ulloasp.mlsuite.schema.review.application.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class SchemaReviewUnavailableException extends ResponseStatusException {
    public SchemaReviewUnavailableException() {
        super(HttpStatus.NOT_FOUND, "Schema review unavailable");
    }
}
