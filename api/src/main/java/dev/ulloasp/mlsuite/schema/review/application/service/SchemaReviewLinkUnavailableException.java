package dev.ulloasp.mlsuite.schema.review.application.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class SchemaReviewLinkUnavailableException extends ResponseStatusException {
    public SchemaReviewLinkUnavailableException() {
        super(HttpStatus.NOT_FOUND, "Schema review link unavailable");
    }
}
